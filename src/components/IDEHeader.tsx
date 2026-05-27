import React from "react";
import { 
  Play, Download, Save, Moon, Sun, 
  Code2, Loader2, Undo2, Redo2, Wand2, LayoutPanelLeft, 
  LayoutPanelTop, Files, Search, HelpCircle, GitBranch
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface IDEHeaderProps {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  undo: () => void;
  redo: () => void;
  layout: "horizontal" | "vertical";
  setLayout: (v: "horizontal" | "vertical") => void;
  handleFormat: () => void;
  isFormatting: boolean;
  handleDownload: () => void;
  handleDownloadProject: () => void;
  handleSave: () => void;
  handleRun: () => void;
  isRunning: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAutoSaveEnabled: boolean;
  toggleAutoSave: () => void;
  onHelpClick: () => void;
  toggleFindReplace: () => void;
  toggleGitModal: () => void;
}

export const IDEHeader: React.FC<IDEHeaderProps> = ({
  isDark, setIsDark,
  isSidebarOpen, setIsSidebarOpen,
  undo, redo,
  layout, setLayout,
  handleFormat, isFormatting,
  handleDownload,
  handleDownloadProject,
  handleSave,
  handleRun, isRunning,
  searchQuery, setSearchQuery,
  isAutoSaveEnabled, toggleAutoSave,
  onHelpClick, toggleFindReplace, toggleGitModal
}: IDEHeaderProps) => {
  return (
    <header className={cn("flex items-center justify-between px-4 py-2 mb-3 rounded-xl border shrink-0 h-14", isDark ? "border-[#30363d] bg-[#0d1117]" : "border-gray-200 bg-white shadow-sm")}>
      <div className="flex items-center gap-2">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={cn("p-1.5 rounded-md text-[#8b949e] hover:text-white hover:bg-[#30363d]/50 transition-colors mr-1")}>
          <Files className="w-4 h-4" />
        </button>
        <Code2 className="w-5 h-5 text-blue-500" />
        <h1 className="font-semibold tracking-tight text-lg">Quantum Studio Code</h1>
      </div>
      
      <div className="flex-1 max-w-md mx-8">
        <div className={cn("relative flex items-center w-full h-8 rounded-md border overflow-hidden", isDark ? "bg-[#010409] border-[#30363d] focus-within:border-blue-500" : "bg-gray-100 border-gray-200 focus-within:border-blue-500")}>
          <button onClick={toggleFindReplace} className={cn("px-2 shrink-0 h-full hover:bg-gray-200 border-r dark:hover:bg-[#30363d] dark:border-[#30363d]")} title="Find in Files">
            <Search className={cn("w-3.5 h-3.5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects and files..."
            className={cn("w-full h-full bg-transparent outline-none px-2 text-sm", isDark ? "text-gray-200 placeholder-gray-500" : "text-gray-800 placeholder-gray-400")}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={cn("flex rounded-lg p-0.5 border", isDark ? "bg-[#010409] border-[#30363d]" : "bg-gray-100 border-gray-200")}>
          <button onClick={undo} className={cn("p-1.5 rounded-md transition-colors", isDark ? "text-[#8b949e] hover:text-white" : "text-gray-500 hover:text-gray-900")} title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} className={cn("p-1.5 rounded-md transition-colors", isDark ? "text-[#8b949e] hover:text-white" : "text-gray-500 hover:text-gray-900")} title="Redo (Ctrl+Y)">
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
        <div className={cn("flex rounded-lg p-1 border", isDark ? "bg-[#010409] border-[#30363d]" : "bg-gray-100 border-gray-200")}>
          <button onClick={() => setLayout(layout === "vertical" ? "horizontal" : "vertical")} className={cn("p-1.5 rounded-md transition-colors", isDark ? "text-[#8b949e] hover:text-white hover:bg-[#30363d]/50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50")} title="Toggle Layout">
            {layout === "vertical" ? <LayoutPanelLeft className="w-4 h-4" /> : <LayoutPanelTop className="w-4 h-4" />}
          </button>
        </div>
        <button onClick={toggleGitModal} className={cn("p-1.5 rounded-md transition-colors", isDark ? "text-[#8b949e] hover:text-white hover:bg-[#30363d]/50 bg-[#161b22]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200 bg-gray-100")} title="Source Control (Git)">
          <GitBranch className="w-4 h-4" />
        </button>
        <button onClick={() => setIsDark(!isDark)} className={cn("p-1.5 rounded-md transition-colors", isDark ? "text-[#8b949e] hover:text-white hover:bg-[#30363d]/50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50")} title="Toggle theme">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button onClick={onHelpClick} className={cn("p-1.5 rounded-md transition-colors", isDark ? "text-[#8b949e] hover:text-white hover:bg-[#30363d]/50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50")} title="Help & Keyboard Shortcuts">
          <HelpCircle className="w-4 h-4" />
        </button>
        <div className={cn("w-[1px] h-4 mx-1", isDark ? "bg-gray-700" : "bg-gray-300")} />
        <button onClick={toggleAutoSave} className={cn("p-1.5 flex gap-2 items-center text-xs font-medium rounded-md transition-colors", isAutoSaveEnabled ? (isDark ? "text-blue-400 hover:bg-[#30363d]/50" : "text-blue-600 hover:bg-gray-200/50") : (isDark ? "text-[#8b949e] hover:text-white hover:bg-[#30363d]/50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"))} title={isAutoSaveEnabled ? "Auto-save is ON" : "Auto-save is OFF"}>
          <Save className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{isAutoSaveEnabled ? "Auto-save ON" : "Auto-save OFF"}</span>
        </button>
        <button onClick={handleFormat} disabled={isFormatting} className={cn("p-1.5 flex gap-2 items-center text-xs font-medium rounded-md transition-colors disabled:opacity-50", isDark ? "text-[#8b949e] hover:text-white hover:bg-[#30363d]/50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50")} title="Beautify Code">
          {isFormatting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          <span className="hidden lg:inline">Format</span>
        </button>
        <button onClick={handleDownloadProject} className={cn("p-1.5 flex gap-2 items-center text-xs font-medium rounded-md transition-colors", isDark ? "text-[#8b949e] hover:text-white hover:bg-[#30363d]/50" : "text-blue-500 hover:text-blue-700 hover:bg-gray-200/50")} title="Download entire project as ZIP">
          <Download className="w-3.5 h-3.5" strokeWidth={3} />
          <span className="hidden lg:inline text-blue-400">Project</span>
        </button>
        <button onClick={handleDownload} className={cn("p-1.5 flex gap-2 items-center text-xs font-medium rounded-md transition-colors", isDark ? "text-[#8b949e] hover:text-white hover:bg-[#30363d]/50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50")} title="Download active file">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">File</span>
        </button>
        <button onClick={handleSave} className={cn("p-1.5 flex gap-2 items-center text-xs font-medium rounded-md transition-colors", isDark ? "text-[#8b949e] hover:text-white hover:bg-[#30363d]/50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50")} title="Save code locally (Ctrl+S)">
          <Save className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Save</span>
        </button>
        <div className={cn("flex rounded-lg p-1 border", isDark ? "bg-[#010409] border-[#30363d]" : "bg-gray-100 border-gray-200")}>
          <button onClick={handleRun} disabled={isRunning} className={cn("flex items-center gap-2 px-3 py-1 rounded shadow-sm text-xs font-semibold transition-colors", isDark ? "bg-[#238636] text-white hover:bg-[#2ea043]" : "bg-blue-600 text-white hover:bg-blue-700", "disabled:opacity-50")} title="Run code (Ctrl+Enter)">
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
            Run
          </button>
        </div>
      </div>
    </header>
  );
};
