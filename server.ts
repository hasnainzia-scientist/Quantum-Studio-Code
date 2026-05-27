import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { exec, execFile } from "child_process";
import { v4 as uuidv4 } from "uuid";
import util from "util";
import cf from "clang-format";
import db from "./db.js";
import { syncProjectToFS, syncFSToProject, getGit } from "./gitManager.js";

const execPromise = util.promisify(exec);

function parseClangError(errOutput: string) {
  const cleanErr = errOutput.replace(/\u001b\[.*?m/g, '');
  const lines = cleanErr.split('\n');
  const errorMatch = cleanErr.match(/(?:[^:]+):(\d+):(\d+):\s*(?:fatal )?error:\s*(.*)/);
  if (!errorMatch) return null;

  const lineNum = errorMatch[1];
  const explanation = errorMatch[3];
  
  let codeSnippet = "";
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    if (text.includes(` ${lineNum} | `) || text.trim().startsWith(`${lineNum} |`)) { 
       let codeLine = text.split('|').slice(1).join('|').trim();
       codeSnippet = codeLine;
       break;
    }
  }
  if (!codeSnippet) {
     for (let i = 0; i < lines.length; i++) {
       if (lines[i].includes("error:") && i + 1 < lines.length) {
         let fallback = lines[i+1].split('|');
         if (fallback.length > 1) {
            codeSnippet = fallback.slice(1).join('|').trim();
         } else { codeSnippet = lines[i+1].trim(); }
         break;
       }
     }
  }

  let suggestion = "Double check the C++ syntax in this area.";
  if (explanation.includes('was not declared in this scope') || explanation.includes('undeclared identifier')) {
     suggestion = "You used a variable or function that hasn't been defined. Make sure it's spelled correctly and included.";
  } else if (explanation.includes('cannot initialize a variable') || explanation.includes('are not pointers to compatible types')) {
     suggestion = "Type mismatch: You are trying to assign the wrong type of value to a variable.";
  } else if (explanation.includes('expected \';\'')) {
     suggestion = "Syntax error: You are missing a semicolon ';' at the end of the statement.";
  } else if (explanation.includes('no matching function for call')) {
     suggestion = "The function you are trying to call doesn't match the signature defined. Check the arguments.";
  } else if (explanation.includes("no member named")) {
     suggestion = "You tried to access a property or method that does not exist on this object/class.";
  } else if (explanation.includes("expected '}")) {
     suggestion = "Check your braces. You might be missing a closing brace '}'.";
  } else if (explanation.includes("expected identifier")) {
     suggestion = "A valid variable or function name is expected here.";
  }

  return {
    line: `Line ${lineNum}`,
    codeSnippet: codeSnippet || "N/A",
    explanation: explanation || "Unknown logic error",
    suggestion: suggestion
  };
}

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json({ limit: '50mb' }));

// Automatically sync all existing projects to the file system on boot
// so that source files are permanently stored directly within the source code.
// Run this asynchronously but don't block
(async () => {
  try {
    const projects = db.prepare('SELECT id FROM projects').all() as any[];
    for (const proj of projects) {
       await syncProjectToFS(proj.id).catch(err => console.error("Could not sync project", proj.id, err));
    }
    console.log(`Synced ${projects.length} projects to FS for long-term retention.`);
  } catch (err) {
    console.error("Failed to sync projects to FS on boot:", err);
  }
})();

  // --- Database API Routes for Projects ---

  // Get all projects overview
  app.get("/api/projects", (req, res) => {
    try {
      const projects = db.prepare('SELECT * FROM projects ORDER BY updatedAt DESC').all();
      // Fetch files for them
      for (const proj of projects as any[]) {
        proj.files = db.prepare('SELECT * FROM files WHERE projectId = ?').all(proj.id).map((f: any) => ({
          ...f,
          isOpen: f.isOpen === 1
        }));
      }
      res.json(projects);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to load projects", details: e.message });
    }
  });

  // Save/Update a full project
  app.post("/api/projects", (req, res) => {
    const { id, name, activeFileId, createdAt, files } = req.body;
    
    if (!id || !name) return res.status(400).json({ error: "Project id and name required" });

    try {
      const tx = db.transaction(() => {
        const now = Date.now();
        const clientUpdatedAt = req.body.updatedAt || now;
        db.prepare(`
          INSERT INTO projects (id, name, activeFileId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            name = excluded.name,
            activeFileId = excluded.activeFileId,
            updatedAt = excluded.updatedAt
        `).run(id, name, activeFileId || null, createdAt || now, clientUpdatedAt);

        // Replace files for this project
        db.prepare('DELETE FROM files WHERE projectId = ?').run(id);

        const insertFile = db.prepare(`
          INSERT INTO files (id, projectId, name, content, type, parentId, isOpen)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const f of files || []) {
          insertFile.run(
            f.id, id, f.name, f.content || '', f.type, f.parentId || null, f.isOpen ? 1 : 0
          );
        }
      });
      tx();
      // Sync it so it's permanently stored as a real file
      syncProjectToFS(id).catch(err => console.error("Could not sync to FS", err));
      res.json({ success: true });
    } catch (e: any) {
      console.error("Failed to save project", e);
      res.status(500).json({ error: "Failed to save project", details: e.message });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const projectId = req.params.id;
      const projectInfo = db.prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as any;
      
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
      
      if (projectInfo) {
        const dirName = projectInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + projectId.substring(0, 8);
        const repoDir = path.join(process.cwd(), 'user_projects', dirName);
        try {
          await fs.rm(repoDir, { recursive: true, force: true });
        } catch (e) {
          console.error("Failed to delete fs repo", e);
        }
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to delete project", details: e.message });
    }
  });

  // --- End DB routes ---

  // API Route for code formatting
  app.post("/api/format", (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code is required" });

    // Use customized style for standardized, best-practice C++ code formatting that enforces block structures
    const styleString = "{BasedOnStyle: Google, AllowShortFunctionsOnASingleLine: None, AllowShortBlocksOnASingleLine: Never, AllowShortIfStatementsOnASingleLine: Never, AllowShortLoopsOnASingleLine: false, BreakBeforeBraces: Attach, MaxEmptyLinesToKeep: 100}";
    const child = execFile(cf.getNativeBinary(), [`-style=${styleString}`], (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ error: "Formatting failed", details: stderr || err.message });
      }
      res.json({ formatted: stdout });
    });
    child.stdin?.write(code);
    child.stdin?.end();
  });

  // API Route for code execution using public Wandbox executor
  app.post("/api/run", async (req, res) => {
    const { code, input, codes } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    // Extract side-files that need to be compiled
    const extraCppFiles = (codes || [])
      .filter((c: any) => c.file && (c.file.endsWith('.cpp') || c.file.endsWith('.cc') || c.file.endsWith('.c') || c.file.endsWith('.cxx')))
      .map((c: any) => c.file)
      .join('\n');

    try {
      const response = await fetch("https://wandbox.org/api/compile.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          codes: codes || [],
          compiler: "clang-head", // changed from gcc-head because gcc nodes on wandbox are throwing OCI clone errors
          stdin: input || "",
          "compiler-option-raw": extraCppFiles
        })
      });

      const data = await response.json();

      let compileOutput = { output: "Compilation successful.", error: false };
      let runOutput = { output: "", stdout: "", stderr: "", code: 0, signal: "" };

      // Wandbox reports compiler errors in compiler_error
      if (data.compiler_error) {
        compileOutput.error = true;
        compileOutput.output = data.compiler_error;
        let simplifiedError = undefined;
        let aiDebug = null;

        try {
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const prompt = `Simplify the following C++ compiler error for a beginner. 
Given the code and the error, provide a JSON response with the following fields strictly:
{
  "line": "The exact line number or context causing the error",
  "codeSnippet": "The problematic code section",
  "explanation": "A short and simple explanation of the issue",
  "suggestion": "A possible fix or suggestion (a single sentence or short snippet)"
}

Error:
${data.compiler_error}

Code:
${code}`;

          const resAi = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
          });
          let text = resAi.text || "{}";
          text = text.replace(/^```json\n/i, '').replace(/```$/i, '').trim();
          simplifiedError = JSON.parse(text);
        } catch (err: any) {
          console.error("AI Simplification Error - falling back to regex parser:", err.message);
          simplifiedError = parseClangError(data.compiler_error);
        }
        
        if (!simplifiedError) {
          simplifiedError = parseClangError(data.compiler_error);
        }

        return res.json({
          compile: { ...compileOutput, simplifiedError },
          run: { output: "", stdout: "", stderr: data.compiler_error, code: 1, signal: "" },
          language: "c++",
          version: "clang-head",
        });
      }

      runOutput.stdout = data.program_output || "";
      runOutput.output = data.program_output || "";
      runOutput.stderr = data.program_error || "";
      runOutput.code = parseInt(data.status) || 0;
      if (data.signal) {
        runOutput.signal = data.signal;
    }

    res.json({ compile: compileOutput, run: runOutput, language: "c++", version: "clang-head" });

  } catch (error: any) {
    console.error("Execution pipeline error:", error);
    res.status(500).json({ error: "Server encountered a critical error.", details: error.message });
  }
});

// API Route for AI code completion
app.post("/api/suggest", async (req, res) => {
  const { code, line, column } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // We want the AI to predict the next few code tokens or a short snippet.
    const prompt = `You are an expert C++ IntelliSense engine. Given the following C++ code up to the cursor position (line ${line}, column ${column}), provide a short, accurate code completion snippet.
    
    Code:
    ${code}
    
    Instructions:
    - Respond ONLY with the raw C++ code to insert at the cursor.
    - Do not include markdown formatting like \`\`\`cpp.
    - Do not explain anything. Keep it brief.
    - Predict the next logical statement, function call, or completion.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    let completion = response.text || "";
    // Clean up if it outputs markdown
    completion = completion.replace(/^```(cpp|c\+\+)?\n/i, '').replace(/```$/i, '').trim();

    res.json({ completion });
  } catch (error: any) {
    console.error("AI Completion Error:", error);
    res.status(500).json({ error: "AI Completion failed", details: error.message });
  }
});

// API Route for AI Type Inference & Hover
app.post("/api/hover", async (req, res) => {
  const { code, word, line, column } = req.body;
  if (!code || !word) return res.status(400).json({ error: "Code and word required" });

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `You are an expert C++ Language Server (like clangd). Given the following C++ code up to line ${line}, determine the full C++ type and a brief explanation for the identifier "${word}" hovered at line ${line}, column ${column}.
    
    Code context:
    ${code}
    
    Respond strictly in JSON format with two keys:
    "type": "the inferred C++ type (e.g. std::vector<int>)",
    "description": "a short 1-sentence explanation of what this variable/function is"`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    let text = response.text || "{}";
    text = text.replace(/^```json\n/i, '').replace(/```$/i, '').trim();
    const result = JSON.parse(text);

    res.json(result);
  } catch (e: any) {
    // silently fail
    res.json({ type: "unknown", description: "Could not infer type." });
  }
});

app.post("/api/lint", async (req, res) => {
  const { code, codes } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const response = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code,
        codes: codes || [],
        compiler: "clang-head",
        options: "-fsyntax-only"
      })
    });

    const data = await response.json();
    res.json({ output: data.compiler_error || "" });
  } catch (error: any) {
    console.error("Linting pipeline error:", error);
    res.status(500).json({ error: "Server encountered a critical error.", details: error.message });
  }
});

// --- Git API Routes ---

app.post("/api/git/:projectId/init", async (req, res) => {
  if (process.env.VERCEL) {
    return res.status(400).json({ error: "Git operations are not supported in Vercel serverless environment." });
  }
  try {
    const { projectId } = req.params;
    await syncProjectToFS(projectId);
    const git = getGit(projectId);
    await git.init();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to init repo", details: e.message });
  }
});

app.get("/api/git/:projectId/status", async (req, res) => {
  try {
    const { projectId } = req.params;
    await syncProjectToFS(projectId);
    const git = getGit(projectId);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return res.json({ isRepo: false });
    
    const status = await git.status();
    res.json({ isRepo: true, status });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to get status", details: e.message });
  }
});

app.post("/api/git/:projectId/commit", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message, authorName, authorEmail } = req.body;
    await syncProjectToFS(projectId);
    const git = getGit(projectId);
    
    if (authorName && authorEmail) {
      await git.addConfig('user.name', authorName);
      await git.addConfig('user.email', authorEmail);
    }
    
    await git.add('.');
    const commitResult = await git.commit(message || "Automated commit");
    res.json({ success: true, commit: commitResult });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to commit", details: e.message });
  }
});

app.get("/api/git/:projectId/log", async (req, res) => {
  try {
    const { projectId } = req.params;
    const git = getGit(projectId);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return res.json({ log: null });
    
    const log = await git.log();
    res.json({ log });
  } catch (e: any) {
    // If no commits yet, git log throws
    res.json({ log: { all: [] } });
  }
});

app.post("/api/git/:projectId/remote", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { url } = req.body;
    const git = getGit(projectId);
    
    const remotes = await git.getRemotes();
    if (remotes.find(r => r.name === 'origin')) {
      await git.removeRemote('origin');
    }
    await git.addRemote('origin', url);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to set remote", details: e.message });
  }
});

app.post("/api/git/:projectId/push", async (req, res) => {
  const { projectId } = req.params;
  try {
    const git = getGit(projectId);
    await git.push('origin', 'master', { '--set-upstream': null });
    res.json({ success: true });
  } catch (e: any) {
    // try main if master fails
    try {
      const git = getGit(projectId);
      await git.push('origin', 'main', { '--set-upstream': null });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to push", details: e.message });
    }
  }
});

app.post("/api/git/:projectId/pull", async (req, res) => {
  try {
    const { projectId } = req.params;
    const git = getGit(projectId);
    
    // Pull and then sync back to db
    await git.pull('origin', 'master').catch(async () => {
      await git.pull('origin', 'main');
    });
    
    await syncFSToProject(projectId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to pull", details: e.message });
  }
});

// --- End Git Routes ---

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
