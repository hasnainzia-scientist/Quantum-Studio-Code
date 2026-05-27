import React, { useState } from "react";
import { Terminal as TerminalIcon, Loader2, AlertCircle, Copy, Check } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ExecutionResult } from "../lib/execute";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConsoleProps {
  activeTab: "output" | "input";
  setActiveTab: (t: "output" | "input") => void;
  isDark: boolean;
  isRunning: boolean;
  error: string | null;
  result: ExecutionResult | null;
  input: string;
  setInput: (v: string) => void;
  consoleRef: React.RefObject<HTMLDivElement | null>;
}

export const Console: React.FC<ConsoleProps> = ({
  activeTab, setActiveTab,
  isDark, isRunning,
  error, result,
  input, setInput,
  consoleRef
}: ConsoleProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let textToCopy = "";
    if (result) {
      if (result.compile?.output && result.compile.output !== "Compilation successful.") {
        textToCopy += "Compiler Output:\n" + result.compile.output + "\n\n";
      }
      if (result.run.output || result.run.stderr) {
        textToCopy += "Program Output:\n";
        if (result.run.output) textToCopy += result.run.output + "\n";
        if (result.run.stderr && !result.compile?.error) textToCopy += result.run.stderr + "\n";
      }
      textToCopy += `Exited with code ${result.run.code}.`;
    } else if (error) {
      textToCopy = "System Error:\n" + error;
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <section className={cn("flex-1 p-0 flex flex-col overflow-hidden", isDark ? "bg-[#010409]" : "bg-gray-50")}>
      <div className={cn("flex items-center justify-between px-3 pt-2 mb-1 border-b", isDark ? "border-[#30363d]" : "border-gray-200")}>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveTab("output")} className={cn("text-[10px] uppercase font-bold pb-1 transition-colors", activeTab === "output" ? (isDark ? "text-white border-b-2 border-blue-500" : "text-black border-b-2 border-blue-500") : "text-[#8b949e] hover:text-[#c9d1d9]")}>
            <div className="flex items-center gap-1.5"><TerminalIcon className="w-3 h-3" /> Console</div>
          </button>
          <button onClick={() => setActiveTab("input")} className={cn("text-[10px] uppercase font-bold pb-1 transition-colors", activeTab === "input" ? (isDark ? "text-white border-b-2 border-blue-500" : "text-black border-b-2 border-blue-500") : "text-[#8b949e] hover:text-[#c9d1d9]")}>
            Standard Input
          </button>
        </div>
        {activeTab === "output" && (result || error) && (
          <button 
            onClick={handleCopy}
            className={cn("text-[10px] uppercase font-bold pb-1 opacity-70 hover:opacity-100 flex items-center gap-1.5 transition-colors", isDark ? "text-white" : "text-black", copied && "text-green-500")}
            title="Copy Output"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />} 
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto relative font-mono text-xs text-[#8b949e]">
        {activeTab === "output" ? (
          <div ref={consoleRef} className="p-3 absolute inset-0 overflow-auto space-y-1">
            {isRunning ? (
              <div className="text-[#8b949e] flex items-center gap-2 italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> [EXEC] Compiling main.cpp...
              </div>
            ) : error ? (
              <div className="text-[#ff7b72] flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold"><AlertCircle className="w-3.5 h-3.5" /> System Error</div>
                <pre className="whitespace-pre-wrap">{error}</pre>
              </div>
            ) : result ? (
              <div className="space-y-2">
                {result.compile?.output && result.compile.output !== "Compilation successful." && (
                  <div>
                    <div className="text-[#8b949e] mb-1 text-[10px] uppercase">Compiler Output</div>
                    
                    {result.compile.simplifiedError && (
                      <div className={cn("mb-3 p-3 rounded-lg border text-sm", isDark ? "bg-[#161b22] border-[#30363d] text-[#e6edf3]" : "bg-red-50 border-red-100 text-red-900")}>
                        <div className="font-semibold mb-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-red-500" /> Simplified Error</div>
                        <div className="space-y-2 text-xs">
                          {result.compile.simplifiedError.line && (
                            <div><span className="font-semibold opacity-70">Location:</span> {result.compile.simplifiedError.line}</div>
                          )}
                          {result.compile.simplifiedError.codeSnippet && (
                            <div className={cn("font-mono px-2 py-1 rounded", isDark ? "bg-black/50" : "bg-black/5")}>
                              {result.compile.simplifiedError.codeSnippet}
                            </div>
                          )}
                          {result.compile.simplifiedError.explanation && (
                            <div><span className="font-semibold opacity-70">Issue:</span> {result.compile.simplifiedError.explanation}</div>
                          )}
                          {result.compile.simplifiedError.suggestion && (
                            <div><span className="font-semibold opacity-70">Fix:</span> {result.compile.simplifiedError.suggestion}</div>
                          )}
                        </div>
                      </div>
                    )}

                    <pre className={cn("whitespace-pre-wrap font-mono text-xs", isDark ? "text-[#ff7b72]" : "text-red-600")}>{result.compile.output}</pre>
                  </div>
                )}
                <div>
                  {result.run.code !== 0 && result.run.signal === "SIGKILL" && (
                    <div className="text-[#ff7b72] mb-1 text-xs"><span className="font-bold">Timeout</span>: Execution killed due to time limit exceeded.</div>
                  )}
                  {result.run.code !== 0 && result.run.signal === "SIGSEGV" && (
                    <div className="text-[#ff7b72] mb-1 text-xs">
                      <span className="font-bold">Segmentation Fault (SIGSEGV)</span>: Your program tried to access memory it shouldn't. Common causes: dereferencing a null pointer, array out of bounds, or stack overflow. <a href="https://en.wikipedia.org/wiki/Segmentation_fault" target="_blank" rel="noreferrer" className="underline">Learn more</a>.
                    </div>
                  )}
                  {result.run.code !== 0 && !result.run.signal && (
                    <div className="text-[#ff7b72] mb-1 text-xs"><span className="font-bold">Exited with code {result.run.code}</span></div>
                  )}

                  <div className={cn("mb-1", isDark ? "text-[#e6edf3]" : "text-gray-700")}>$ ./a.out</div>
                  {result.run.output && (
                    <div className={cn("px-3 py-2 rounded whitespace-pre-wrap font-mono shadow-sm", isDark ? "bg-[#161b22] text-[#e6edf3] border border-[#30363d]" : "bg-white text-gray-900 border border-gray-200")}>{result.run.output}</div>
                  )}
                  {result.run.stderr && !result.compile?.error && (
                    <div className={cn("px-3 py-2 rounded whitespace-pre-wrap font-mono shadow-sm mt-2", isDark ? "bg-[#161b22] text-[#ff7b72] border border-[#30363d]" : "bg-white text-red-600 border border-gray-200")}>{result.run.stderr}</div>
                  )}
                  {result.run.stderr && result.run.stderr.includes("std::out_of_range") && (
                    <div className="text-[#ff7b72] mt-1 text-xs">
                      <span className="font-bold">Out of Range Exception</span>: Your program tried to access an element outside the bounds of a container (like std::vector or std::string).
                    </div>
                  )}
                  <div className={cn("mt-2", result.run.code === 0 ? "text-[#7ee787]" : "text-[#ff7b72]")}>Process finished with exit code {result.run.code}.</div>
                </div>
              </div>
            ) : (
              <div className="text-[#8b949e] italic">Code output will appear here. Press Run or Ctrl+Enter to execute.</div>
            )}
          </div>
        ) : (
          <div className="p-0 absolute inset-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter standard input here... (stdin)\nExample:\n123\nAlice"
              className={cn("w-full h-full px-3 py-2 resize-none outline-none font-mono text-xs leading-relaxed", isDark ? "bg-transparent text-[#e6edf3] placeholder-[#8b949e]" : "bg-transparent text-gray-800 placeholder-gray-400")}
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </section>
  );
};
