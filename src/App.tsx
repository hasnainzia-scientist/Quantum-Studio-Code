import React, { useEffect, useState, useRef, useMemo } from "react";
import MonacoEditor from "@monaco-editor/react";
import type { editor, languages } from "monaco-editor";
import { registerCppIntellisense } from "./lib/intellisense";

// Marker severity values from monaco-editor:
const MarkerSeverity = {
  Error: 8,
  Warning: 4,
  Info: 2,
  Hint: 1
};
import { 
  Play, Download, Save, Moon, Sun, Terminal as TerminalIcon, 
  Code2, Loader2, AlertCircle, Wand2, LayoutPanelLeft, 
  LayoutPanelTop, Undo2, Redo2, Folder, File, FolderPlus, 
  FilePlus, Trash2, Edit2, ChevronRight, ChevronDown, 
  MoreVertical, X, Check, Files, FolderTree,
  Search, BookOpen, Settings
} from "lucide-react";
import { executeCode, formatCode, lintCode, ExecutionResult } from "./lib/execute";
import { defineMonacoThemes } from "./lib/theme";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import JSZip from "jszip";
import { FileItem, Project } from "./types";
import { FileTreeItem } from "./components/FileExplorer";
import { useProjectManager } from "./hooks/useProjectManager";
import { IDEHeader } from "./components/IDEHeader";
import { Console } from "./components/Console";
import { ProjectExplorer } from "./components/ProjectExplorer";
import { GitModal } from "./components/GitModal";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";

export default function App() {
  const {
    projects, setProjects,
    activeProjectId, setActiveProjectId,
    activeProject,
    files, setFiles,
    activeFileId, setActiveFileId,
    activeFile,
    code, setCode,
    createProject,
    deleteProjectFromBackend,
    renameProjectFromBackend,
    DEFAULT_CODE, DEFAULT_HEADER,
    isLoaded,
    openTabs, closeTab,
    removeTabsIfDeleted,
    addFileToProject,
    isAutoSaveEnabled, toggleAutoSave
  } = useProjectManager();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [isFilesOpen, setIsFilesOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isDark, setIsDark] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"output" | "input">("output");
  const [layout, setLayout] = useState<"horizontal" | "vertical">("vertical");
  const [isFormatting, setIsFormatting] = useState(false);
  const [isLinting, setIsLinting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [fileFilterType, setFileFilterType] = useState<"all" | "files" | "folders">("all");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showGitModal, setShowGitModal] = useState(false);
  
  // Find and Replace across files
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  const handleMoveFile = (draggedId: string, targetId: string | null) => {
    if (draggedId === targetId) return;
    setFiles(prev => {
      // Find the dragged item and target item
      const item = prev.find(f => f.id === draggedId);
      const target = prev.find(f => f.id === targetId);
      if (!item) return prev;

      // Handle reordering or changing parent
      let newParentId = targetId;
      if (target && target.type === 'file') {
         newParentId = target.parentId;
      }

      // Detect cycles (can't move folder into its own descendant)
      let currentParentId = newParentId;
      while (currentParentId) {
         if (currentParentId === draggedId) return prev; // Cycle detected
         currentParentId = prev.find(f => f.id === currentParentId)?.parentId || null;
      }

      const updatedItem = { ...item, parentId: newParentId };
      const rest = prev.filter(f => f.id !== draggedId);

      // Try to place the item correctly (after the target if it's a file, or end of folder if it's a folder)
      if (targetId && target && target.type === 'file') {
         const targetIdx = rest.findIndex(f => f.id === targetId);
         if (targetIdx !== -1) {
            rest.splice(targetIdx + 1, 0, updatedItem);
            return rest;
         }
      } else if (targetId && target && target.type === 'folder') {
         // Optionally change folder to isOpen = true
         const targetIdx = rest.findIndex(f => f.id === targetId);
         if (targetIdx !== -1) {
            rest[targetIdx] = { ...rest[targetIdx], isOpen: true };
         }
      }

      return [...rest, updatedItem];
    });
  };

  const getFilteredFiles = (allFiles: FileItem[]) => {
    let filtered = allFiles;
    
    // Global search or local search
    const query = fileSearchQuery || searchQuery;
    if (query) {
      filtered = filtered.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
    } else {
      filtered = filtered.filter(f => f.parentId === null);
    }
    
    if (fileFilterType === "files") {
       filtered = filtered.filter(f => f.type === "file");
    } else if (fileFilterType === "folders") {
       filtered = filtered.filter(f => f.type === "folder");
    }
    return filtered;
  };

  const confirmSave = () => {
    handleSave();
    setShowSaveConfirm(false);
  };

  const triggerSave = () => {
    if (isAutoSaveEnabled) {
      handleSave();
    } else {
      setShowSaveConfirm(true);
    }
  };
  
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const deleteProject = (id: string) => {
    if (projects.length <= 1) return;
    deleteProjectFromBackend(id);
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (activeProjectId === id) {
      setActiveProjectId(newProjects[0].id);
    }
  };

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [result, error, isRunning]);

  const updateMarkers = (output: string) => {
    const monaco = (window as any).monaco;
    const editorLib = monaco?.editor;
    if (!editorLib || !monaco || !editorRef.current) return;

    // Reset markers for all files first
    files.forEach(f => {
      if (f.type === 'file') {
        const uri = monaco.Uri.parse(`file:///${getFilePath(f)}`);
        const model = editorLib.getModel(uri);
        if (model) {
          editorLib.setModelMarkers(model, "cpp-compiler", []);
        }
      }
    });

    if (!output) return;

    // We use a map to group markers by file ID
    const markersByFileId: Record<string, editor.IMarkerData[]> = {};
    files.forEach(f => { markersByFileId[f.id] = []; });

    const errorRegex = /([^:\n]+):(\d+):(\d+): (error|warning|note): (.*)/g;
    let match;
    while ((match = errorRegex.exec(output)) !== null) {
      const filePath = match[1];
      const line = parseInt(match[2]);
      const col = parseInt(match[3]);
      const type = match[4];
      let severity = MarkerSeverity.Info;
      if (type === 'error') severity = MarkerSeverity.Error;
      else if (type === 'warning') severity = MarkerSeverity.Warning;
      
      const message = match[5];
      
      // Determine which file this belongs to.
      // Wandbox calls the main code file 'prog.cc'
      let targetFileId = activeFileId; 
      if (!filePath.includes('prog.cc')) {
        // Find which file matches the given path
        const found = files.find(f => getFilePath(f) === filePath || filePath.endsWith(f.name));
        if (found) targetFileId = found.id;
      }
      
      if (targetFileId) {
        const targetFile = files.find(f => f.id === targetFileId);
        if (targetFile) {
          const uri = monaco.Uri.parse(`file:///${getFilePath(targetFile)}`);
          const model = editorLib.getModel(uri);
          
          if (model) {
            let validLine = line;
            if (isNaN(validLine) || validLine < 1) validLine = 1;
            const lineCount = model.getLineCount();
            if (validLine > lineCount) validLine = lineCount;
            
            let endCol = col;
            let startCol = col;
            try {
              const word = model.getWordAtPosition({ lineNumber: validLine, column: col });
              if (word) {
                startCol = word.startColumn;
                endCol = word.endColumn;
              } else {
                const maxCol = model.getLineMaxColumn(validLine);
                endCol = Math.min(col + 1, maxCol);
              }
            } catch(e) {
              endCol = col + 1;
            }

            markersByFileId[targetFileId].push({
              startLineNumber: validLine,
              startColumn: startCol,
              endLineNumber: validLine,
              endColumn: endCol,
              message: message.trim(),
              severity: severity,
              source: 'C++ Compiler'
            });
          }
        }
      }
    }

    // Apply markers to all models that have errors
    Object.keys(markersByFileId).forEach(fileId => {
      const targetFile = files.find(f => f.id === fileId);
      if (targetFile) {
        const uri = monaco.Uri.parse(`file:///${getFilePath(targetFile)}`);
        const model = editorLib.getModel(uri);
        if (model) {
          editorLib.setModelMarkers(model, "cpp-compiler", markersByFileId[fileId]);
        }
      }
    });
  };

  useEffect(() => {
    if (result && result.compile && result.compile.output) {
      updateMarkers(result.compile.output);
    }
  }, [result]);

  // Debounced real-time linting
  useEffect(() => {
    if (!activeFileId || !code) {
      updateMarkers("");
      return;
    }
    
    setIsLinting(true);
    const timer = setTimeout(async () => {
      try {
        let entryFile = files.find(f => f.id === activeFileId);
        if (!entryFile) return;
        const otherFiles = files
          .filter(f => f.type === 'file' && f.id !== entryFile!.id)
          .map(f => ({ file: getFilePath(f), code: f.content }));
          
        const res = await lintCode(code, otherFiles);
        updateMarkers(res.output);
      } catch (err) {
        console.error("Linting failed:", err);
      } finally {
        setIsLinting(false);
      }
    }, 800); // 800ms debounce
    
    return () => clearTimeout(timer);
  }, [code, activeFileId]);

  useEffect(() => {
    const editorLib = (window as any).monaco;
    if (editorRef.current && editorLib) {
      
      // Ensure all models exist so jump to definition works
      files.forEach(f => {
        if (f.type !== 'file') return;
        const uri = editorLib.Uri.parse(`file:///${getFilePath(f)}`);
        let model = editorLib.editor.getModel(uri);
        if (!model) {
          editorLib.editor.createModel(f.content, 'cpp', uri);
        } else if (f.id !== activeFileId && model.getValue() !== f.content) {
          // Sync backend state into model if changed externally
          model.setValue(f.content);
        }
      });

      // Intercept model changes (e.g. from jump to definition)
      const disposeModelChange = editorRef.current.onDidChangeModel((e: any) => {
        if (!e.newModelUrl) return;
        const newPath = e.newModelUrl.path.substring(1); // remove leading /
        const targetFile = files.find(f => getFilePath(f) === newPath);
        if (targetFile && targetFile.id !== activeFileId) {
          setActiveFileId(targetFile.id);
        }
      });

      const languages = editorLib.languages;
      
      // Register custom providers once
      const disposeDefinition = languages.registerDefinitionProvider('cpp', {
        provideDefinition: (model: any, position: any) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          for (const file of files) {
            const lines = file.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const regex = new RegExp(`\\b(class|struct|void|int|float|double|char|auto|std::string)\\s+${word.word}\\b|[\\w:*&]+\\s+${word.word}\\s*\\(`, 'g');
              if (regex.test(line)) {
                return {
                  uri: editorLib.Uri.parse(`file:///${getFilePath(file)}`),
                  range: {
                    startLineNumber: i + 1,
                    startColumn: 1,
                    endLineNumber: i + 1,
                    endColumn: line.length + 1
                  }
                };
              }
            }
          }
          return null;
        }
      });

      const disposeCompletion = registerCppIntellisense(editorLib, () => files);

      return () => {
        disposeModelChange.dispose();
        disposeDefinition.dispose();
        disposeCompletion.dispose();
      };
    }
  }, [files, projects, activeProjectId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        triggerSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    
    // Auto-save on blur
    const handleBlur = () => {
      if (isAutoSaveEnabled) {
        handleSave();
      }
    };
    window.addEventListener("blur", handleBlur);
    
    // Save on beforeunload
    const handleBeforeUnload = () => {
      if (isAutoSaveEnabled || localStorage.getItem("cpp-ide-autosave") === "true") {
        if (activeProject) {
          // Synchronous fetch or keepalive can be used, but since it's hard, 
          // we just do a beacon or localstorage backup reliably. Localstorage is already handled in useProjectManager.
          // Optionally, user will be prompted if isAutoSaveEnabled is false.
        }
      }
    };
    
    if (!isAutoSaveEnabled) {
      const handleBeforeUnloadWarn = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener("beforeunload", handleBeforeUnloadWarn);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("beforeunload", handleBeforeUnloadWarn);
      };
    }
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [code, input, files, activeProject, isAutoSaveEnabled]);

  const handleRun = async () => {
    if (!activeFileId) return;
    setIsRunning(true);
    setError(null);
    setResult(null);
    setActiveTab("output");
    try {
      // Find the entry point file. Prefer main.cpp or current file if it's a source file.
      let entryFile = files.find(f => f.id === activeFileId);
      const mainCpp = files.find(f => f.name === 'main.cpp' && f.type === 'file');
      
      if (mainCpp && entryFile?.type !== 'file') {
        entryFile = mainCpp;
      } else if (!entryFile || entryFile.type !== 'file') {
        // Find any .cpp file if active is not one
        entryFile = files.find(f => f.type === 'file' && f.name.endsWith('.cpp')) || files.find(f => f.type === 'file');
      }

      if (!entryFile) throw new Error("No source file found to run.");
      
      const otherFiles = files
        .filter(f => f.type === 'file' && f.id !== entryFile!.id)
        .map(f => ({ file: getFilePath(f), code: f.content }));
      
      const res = await executeCode(entryFile.content, input, otherFiles);
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An unknown error occurred");
    } finally {
      setIsRunning(false);
    }
  };

  const handleFormat = async () => {
    setIsFormatting(true);
    try {
      const formatted = await formatCode(code);
      if (formatted) setCode(formatted);
    } catch (e: any) {
      console.error("Format Failed:", e);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleSave = () => {
    if (activeProject) {
      axios.post("/api/projects", activeProject).catch(console.error);
    }
    // Also update typical localstorage just in case
    localStorage.setItem("cpp-ide-projects", JSON.stringify(projects));
  };

  const undo = () => editorRef.current?.trigger('source', 'undo', null);
  const redo = () => editorRef.current?.trigger('source', 'redo', null);
  
  const getFilePath = (file: FileItem): string => {
    let path = file.name;
    let current = file;
    while (current.parentId) {
      const parent = files.find(f => f.id === current.parentId);
      if (parent) {
        path = `${parent.name}/${path}`;
        current = parent;
      } else {
        break;
      }
    }
    return path;
  };

  const createFile = (parentId: string | null = null) => {
    const newFile: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'new_file.cpp',
      content: '',
      type: 'file',
      parentId
    };
    setFiles(prev => [...prev, newFile]);
    setEditingId(newFile.id);
    setEditingName(newFile.name);
    setActiveFileId(newFile.id);
  };

  const createFolder = (parentId: string | null = null) => {
    const newFolder: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'new_folder',
      content: '',
      type: 'folder',
      parentId,
      isOpen: true
    };
    setFiles(prev => [...prev, newFolder]);
    setEditingId(newFolder.id);
    setEditingName(newFolder.name);
  };

  const handleRename = () => {
    if (!editingId) return;
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setEditingId(null);
      setEditingName("");
      return;
    }
    
    if (projects.some(p => p.id === editingId)) {
      renameProjectFromBackend(editingId, trimmedName);
    } else {
      renameItem(editingId, trimmedName);
    }
    setEditingId(null);
  };

  const deleteItem = (id: string) => {
    const idsToDelete = [id];
    const findChildren = (parentId: string) => {
      files.forEach(f => {
        if (f.parentId === parentId) {
          idsToDelete.push(f.id);
          if (f.type === 'folder') findChildren(f.id);
        }
      });
    };
    findChildren(id);
    setFiles(prev => prev.filter(f => !idsToDelete.includes(f.id)));
    removeTabsIfDeleted(idsToDelete);

    // Dispose Monaco models
    const editorLib = (window as any).monaco;
    if (editorLib) {
      files.filter(f => idsToDelete.includes(f.id)).forEach(f => {
        const uri = editorLib.Uri.parse(`file:///${getFilePath(f)}`);
        const model = editorLib.editor.getModel(uri);
        if (model) model.dispose();
      });
    }

    if (idsToDelete.includes(activeFileId || "")) {
      const remainingFiles = files.filter(f => f.type === 'file' && !idsToDelete.includes(f.id));
      setActiveFileId(remainingFiles[0]?.id || null);
    }
  };

  const renameItem = (id: string, newName: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  const toggleFolder = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, isOpen: !f.isOpen } : f));
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadProject = async () => {
    if (!activeProject) return;
    const zip = new JSZip();
    
    files.forEach(f => {
      if (f.type === 'file') {
        zip.file(getFilePath(f), f.content);
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProject.name.replace(/\s+/g, '_')}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const insertBoilerplate = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const boilerplate = `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  \n\n\n  \n\n  return 0;\n}\n`;
    const selection = editor.getSelection();
    if (selection) {
      editor.executeEdits('boilerplate-inserter', [
        {
          range: selection,
          text: boilerplate,
          forceMoveMarkers: true
        }
      ]);
    }
  };

  if (!isLoaded) {
    return (
      <div className={cn("h-screen w-full flex items-center justify-center font-sans", isDark ? "bg-[#010409] text-white" : "bg-gray-50 text-gray-900")}>
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  const replaceAcrossFiles = () => {
    if (!findText) return;
    let occurrences = 0;
    const updatedFiles = files.map(file => {
      if (file.type !== 'file') return file;
      const regex = new RegExp(findText, 'g');
      const matches = file.content.match(regex);
      if (matches) occurrences += matches.length;
      return { ...file, content: file.content.replace(regex, replaceText) };
    });
    if (occurrences > 0) {
      setFiles(updatedFiles);
      if (activeFileId) {
        const activeFile = updatedFiles.find(f => f.id === activeFileId);
        if (activeFile) setCode(activeFile.content);
      }
    }
  };

  return (
    <div className={cn("h-screen w-full flex flex-col font-sans transition-colors duration-200", isDark ? "bg-[#010409] text-[#e6edf3] p-3" : "bg-gray-50 text-gray-900 p-3")}>
      <IDEHeader 
        isDark={isDark} setIsDark={setIsDark}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        undo={undo} redo={redo}
        layout={layout} setLayout={setLayout}
        handleFormat={handleFormat} isFormatting={isFormatting}
        handleDownload={handleDownload}
        handleDownloadProject={handleDownloadProject}
        handleSave={triggerSave}
        handleRun={handleRun} isRunning={isRunning}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        isAutoSaveEnabled={isAutoSaveEnabled} toggleAutoSave={toggleAutoSave}
        onHelpClick={() => setShowHelpModal(true)}
        toggleFindReplace={() => {
          setIsSidebarOpen(true);
          setIsFindReplaceOpen(!isFindReplaceOpen);
        }}
        toggleGitModal={() => setShowGitModal(true)}
      />

      <div className="flex-1 overflow-hidden flex gap-3 relative">
        {isSidebarOpen && (
          <aside className={cn("w-full md:w-64 absolute md:relative z-30 flex flex-col rounded-xl border overflow-hidden shrink-0 transition-all h-full", isDark ? "bg-[#0d1117] border-[#30363d]" : "bg-white border-gray-200 shadow-sm")}>
            <div className="flex-1 overflow-y-auto flex flex-col">
              
              {/* Find and Replace Section */}
              {isFindReplaceOpen && (
                <div className={cn("p-3 border-b flex flex-col gap-2", isDark ? "bg-[#161b22] border-[#30363d]" : "bg-gray-50 border-gray-200")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Find in Files</span>
                    <button onClick={() => setIsFindReplaceOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="Find"
                    className={cn("w-full h-7 border rounded px-2 text-xs outline-none", isDark ? "bg-[#0d1117] border-[#30363d] text-gray-200 focus:border-blue-500" : "bg-white border-gray-200 text-gray-800 focus:border-blue-500")}
                  />
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Replace"
                    className={cn("w-full h-7 border rounded px-2 text-xs outline-none", isDark ? "bg-[#0d1117] border-[#30363d] text-gray-200 focus:border-blue-500" : "bg-white border-gray-200 text-gray-800 focus:border-blue-500")}
                  />
                  <button onClick={replaceAcrossFiles} className={cn("w-full mt-1 px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition-colors", isDark ? "bg-[#238636] text-white hover:bg-[#2ea043]" : "bg-blue-600 text-white hover:bg-blue-700")}>
                    Replace All
                  </button>
                </div>
              )}

              {/* Projects Section Header */}
              <div 
                className={cn("flex items-center justify-between px-2 py-1.5 border-b select-none group", isDark ? "border-[#30363d] bg-[#161b22]" : "border-gray-200 bg-gray-50")}
              >
                <div 
                  className="flex items-center flex-1 cursor-pointer"
                  onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                >
                  {isProjectsOpen ? <ChevronDown className="w-4 h-4 mr-1 text-gray-400" /> : <ChevronRight className="w-4 h-4 mr-1 text-gray-400" />}
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Projects</span>
                </div>
                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      createProject("New Project");
                    }} 
                    className="p-1 hover:bg-gray-200 dark:hover:bg-[#30363d] rounded transition-colors" 
                    title="New Project"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Projects List */}
              {isProjectsOpen && (
                <div className="flex flex-col border-b border-inherit max-h-[40%] overflow-y-auto min-h-[100px]">
                  <ProjectExplorer 
                    projects={projects}
                    activeProjectId={activeProjectId}
                    setActiveProjectId={setActiveProjectId}
                    setView={() => {}}
                    isDark={isDark}
                    editingId={editingId}
                    editingName={editingName}
                    setEditingId={setEditingId}
                    setEditingName={setEditingName}
                    handleRename={handleRename}
                    deleteProject={deleteProject}
                    addFileToProject={addFileToProject}
                    searchQuery={searchQuery}
                  />
                </div>
              )}

              {/* Files Section Header */}
              <div 
                className={cn("flex flex-col border-b group", isDark ? "border-[#30363d] bg-[#161b22]" : "border-gray-200 bg-gray-50")}
              >
                <div className="flex items-center justify-between px-2 py-1.5 select-none">
                  <div 
                    className="flex items-center flex-1 cursor-pointer truncate"
                    onClick={() => setIsFilesOpen(!isFilesOpen)}
                  >
                    {isFilesOpen ? <ChevronDown className="w-4 h-4 mr-1 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 mr-1 text-gray-400 shrink-0" />}
                    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 truncate">{activeProject?.name || "Files"}</span>
                  </div>
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => createFile()} className="p-1 hover:bg-gray-200 dark:hover:bg-[#30363d] rounded transition-colors" title="New File"><FilePlus className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => createFolder()} className="p-1 hover:bg-gray-200 dark:hover:bg-[#30363d] rounded transition-colors" title="New Folder"><FolderPlus className="w-3.5 h-3.5 text-gray-500" /></button>
                  </div>
                </div>
                {isFilesOpen && (
                  <div className="px-2 pb-1.5 flex flex-col gap-1.5">
                    <div className={cn("flex items-center w-full h-6 rounded border overflow-hidden", isDark ? "bg-[#010409] border-[#30363d]" : "bg-white border-gray-200")}>
                      <Search className="w-3 h-3 ml-1.5 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={fileSearchQuery}
                        onChange={(e) => setFileSearchQuery(e.target.value)}
                        placeholder="Search files..."
                        className={cn("w-full h-full bg-transparent outline-none px-1.5 text-[11px]", isDark ? "text-gray-200 placeholder-gray-500" : "text-gray-800 placeholder-gray-400")}
                      />
                    </div>
                    <div className="flex items-center gap-1 w-full flex-wrap">
                      <select 
                        value={fileFilterType} 
                        onChange={(e) => setFileFilterType(e.target.value as any)}
                        className={cn("text-[10px] rounded px-1 py-0.5 outline-none border", isDark ? "bg-[#010409] border-[#30363d] text-gray-300" : "bg-white border-gray-200 text-gray-600")}
                      >
                        <option value="all">All Types</option>
                        <option value="files">Files Only</option>
                        <option value="folders">Folders Only</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Files List */}
              {isFilesOpen && (
                <div className="flex-1 overflow-y-auto py-2">
                  {(getFilteredFiles(files)).map(item => (
                    <FileTreeItem 
                      key={item.id} 
                      item={item} 
                      files={files}
                      activeFileId={activeFileId}
                      editingId={editingId}
                      editingName={editingName}
                      toggleFolder={toggleFolder}
                      setActiveFileId={setActiveFileId}
                      createFile={createFile}
                      createFolder={createFolder}
                      setEditingId={setEditingId}
                      setEditingName={setEditingName}
                      deleteItem={deleteItem}
                      isDark={isDark}
                      renameItem={handleRename}
                      searchQuery={fileSearchQuery || searchQuery || (fileFilterType !== "all" ? "filter" : undefined)}
                      onMoveItem={handleMoveFile}
                    />
                  ))}
                  {files.length === 0 && activeProjectId && (
                    <div className="px-4 py-8 text-center text-[10px] text-[#8b949e] italic uppercase">
                      Project is empty
                      <button onClick={() => setFiles([
                        { id: '1', name: 'main.cpp', content: DEFAULT_CODE, type: 'file', parentId: null },
                        { id: '2', name: 'utils.h', content: DEFAULT_HEADER, type: 'file', parentId: null }
                      ])} className="block w-full mt-2 text-blue-500 hover:underline">Restore Defaults</button>
                    </div>
                  )}
                  {!activeProjectId && (
                    <div className="px-4 py-8 text-center text-[10px] text-[#8b949e] italic uppercase">
                      No project selected
                    </div>
                  )}
                </div>
              )}

            </div>
          </aside>
        )}

        <PanelGroup 
          orientation={layout === "vertical" ? "vertical" : "horizontal"} 
          className={cn("flex-1 rounded-xl border shadow-sm overflow-hidden", isDark ? "border-[#30363d] bg-[#0d1117]" : "border-gray-200 bg-white")}
        >
          <Panel defaultSize={65} minSize={30} className="relative flex flex-col w-full h-full">
            
            {/* Editor Tabs */}
            {openTabs.length > 0 && (
              <div className={cn("flex overflow-x-auto shrink-0 border-b", isDark ? "bg-[#0d1117] border-[#30363d]" : "bg-gray-50 border-gray-200")}>
                {openTabs.map(tabId => {
                  const f = files.find(f => f.id === tabId);
                  if (!f) return null;
                  const isActiveTab = activeFileId === tabId;
                  return (
                    <div 
                      key={tabId} 
                      onClick={() => setActiveFileId(tabId)}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2 text-[11px] font-mono cursor-pointer border-r border-transparent min-w-max transition-colors",
                        isActiveTab 
                          ? (isDark ? "bg-[#161b22] text-white border-[#30363d] border-t-2 border-t-blue-500" : "bg-white text-blue-600 border-gray-200 border-t-2 border-t-blue-500") 
                          : (isDark ? "text-[#8b949e] border-[#30363d] border-t-2 border-t-transparent hover:bg-[#1c2128]" : "text-gray-500 border-gray-200 border-t-2 border-t-transparent hover:bg-gray-100")
                      )}
                    >
                      <File className={cn("w-3.5 h-3.5", isActiveTab ? "text-blue-500" : "text-gray-400")} />
                      <span>{f.name}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); closeTab(tabId); }}
                        className={cn("p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity", isDark ? "hover:bg-[#30363d]" : "hover:bg-gray-200")}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex-1 relative">
            {activeFileId ? (
              <MonacoEditor
                path={activeFile ? getFilePath(activeFile) : undefined}
                language={activeFile?.name.endsWith('.h') || activeFile?.name.endsWith('.hpp') ? 'cpp' : 'cpp'}
                theme={isDark ? "quantum-dark" : "quantum-light"}
                value={code}
                onChange={(val) => setCode(val || "")}
                beforeMount={defineMonacoThemes}
                onMount={(editor, monaco) => { 
                  editorRef.current = editor; 
                  
                  // Register F3 key binding
                  editor.addAction({
                    id: 'insert-boilerplate',
                    label: 'Insert Boilerplate Code',
                    keybindings: [monaco.KeyCode.F3],
                    run: () => {
                      insertBoilerplate();
                    }
                  });

                  // Register Find in Files explicitly to the command palette
                  editor.addAction({
                    id: 'find-in-files',
                    label: 'Find and Replace in All Files',
                    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
                    run: () => {
                      setIsSidebarOpen(true);
                      setIsFindReplaceOpen(true);
                    }
                  });
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  automaticLayout: true,
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  scrollBeyondLastColumn: 5,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: true
                  },
                  suggestOnTriggerCharacters: true,
                  parameterHints: { enabled: true },
                  snippetSuggestions: "inline",
                  formatOnPaste: true,
                  formatOnType: true,
                  folding: true,
                  links: true,
                  colorDecorators: true,
                  dragAndDrop: true
                }}
                loading={<div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-gray-500 w-6 h-6" /></div>}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50 h-full">
                <Code2 className="w-12 h-12 mb-4" />
                <p className="text-sm">Select a file to start coding</p>
              </div>
            )}
            </div>
          </Panel>
          
          <PanelResizeHandle className={cn(
            "flex items-center justify-center transition-colors",
            layout === "vertical" ? "h-2 cursor-row-resize w-full" : "w-2 cursor-col-resize h-full",
            isDark ? "bg-[#0d1117] hover:bg-[#30363d]" : "bg-gray-100 hover:bg-gray-200"
          )}>
            <div className={cn(
              "rounded-full bg-gray-400",
              layout === "vertical" ? "w-8 h-1" : "h-8 w-1"
            )} />
          </PanelResizeHandle>

          <Panel defaultSize={35} minSize={20} className="flex flex-col relative w-full h-full">
            <Console 
              activeTab={activeTab} setActiveTab={setActiveTab}
              isDark={isDark} isRunning={isRunning}
              error={error} result={result}
              input={input} setInput={setInput}
              consoleRef={consoleRef as React.RefObject<HTMLDivElement | null>}
            />
          </Panel>
        </PanelGroup>
      </div>

      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={cn("rounded-xl border shadow-xl p-6 w-full max-w-md", isDark ? "bg-[#0d1117] border-[#30363d]" : "bg-white border-gray-200")}>
            <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>Save Project</h3>
            <p className={cn("text-sm mb-6", isDark ? "text-[#8b949e]" : "text-gray-500")}>Are you sure you want to save the project? This will overwrite the previously saved state.</p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowSaveConfirm(false)}
                className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors", isDark ? "hover:bg-[#30363d] text-white" : "hover:bg-gray-100 text-gray-900")}
              >
                Cancel
              </button>
              <button 
                onClick={confirmSave}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={cn("rounded-xl border shadow-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto", isDark ? "bg-[#0d1117] border-[#30363d] text-[#e6edf3]" : "bg-white border-gray-200 text-gray-900")}>
            <div className="flex items-center justify-between mb-4 border-b pb-4 border-gray-200 dark:border-[#30363d]">
              <h3 className="text-xl font-semibold">Help & Keyboard Shortcuts</h3>
              <button 
                onClick={() => setShowHelpModal(false)}
                className={cn("p-1.5 rounded transition-colors", isDark ? "hover:bg-[#30363d]" : "hover:bg-gray-100")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium mb-3 flex items-center gap-2"><Code2 className="w-5 h-5 text-blue-500" /> Editor Features</h4>
                <ul className="list-disc pl-5 space-y-2 text-sm opacity-90">
                  <li><strong>Hover over standard C++ keywords</strong> (like <code>std</code>, <code>vector</code>, <code>cout</code>) to see contextual explanations of syntax and usage.</li>
                  <li><strong>Multiple projects and files</strong> are supported. Use the sidebar to create, rename, or delete files.</li>
                  <li>Files support <strong>drag and drop</strong>. Move files between folders directly in the explorer.</li>
                  <li><strong>Auto-save</strong> can be toggled using the save button in the header. If off, you'll be prompted when saving.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-medium mb-3">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className={cn("p-3 rounded border", isDark ? "bg-[#010409] border-[#30363d]" : "bg-gray-50 border-gray-200")}>
                    <div className="flex justify-between items-center mb-1"><span>Run Code</span> <kbd className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-xs font-mono">Ctrl + Enter</kbd></div>
                    <div className="flex justify-between items-center mb-1"><span>Save Project</span> <kbd className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-xs font-mono">Ctrl + S</kbd></div>
                    <div className="flex justify-between items-center mb-1"><span>Undo</span> <kbd className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-xs font-mono">Ctrl + Z</kbd></div>
                    <div className="flex justify-between items-center"><span>Redo</span> <kbd className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-xs font-mono">Ctrl + Y</kbd></div>
                  </div>
                  <div className={cn("p-3 rounded border", isDark ? "bg-[#010409] border-[#30363d]" : "bg-gray-50 border-gray-200")}>
                    <div className="flex justify-between items-center mb-1"><span>Format Code</span> <kbd className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-xs font-mono">Shift + Alt + F</kbd></div>
                    <div className="flex justify-between items-center mb-1"><span>Command Palette</span> <kbd className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-xs font-mono">F1</kbd></div>
                    <div className="flex justify-between items-center mb-1"><span>Insert Boilerplate</span> <kbd className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-xs font-mono">F3</kbd></div>
                    <div className="flex justify-between items-center mb-1"><span>Find in Files</span> <kbd className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-xs font-mono">Ctrl + Shift + F</kbd></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Git Modal */}
      {showGitModal && activeProjectId && (
        <GitModal
          projectId={activeProjectId}
          onClose={() => setShowGitModal(false)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
