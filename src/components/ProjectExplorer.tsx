import React from "react";
import { Project, FileItem } from "../types";
import { Folder, Edit2, Trash2, ChevronRight, X, Check, FilePlus, FolderPlus } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProjectExplorerProps {
  projects: Project[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string) => void;
  setView: (v: "files" | "projects") => void;
  isDark: boolean;
  editingId: string | null;
  editingName: string;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  handleRename: () => void;
  deleteProject: (id: string) => void;
  addFileToProject: (projectId: string, name: string, type: 'file' | 'folder') => void;
  searchQuery: string;
}

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  projects,
  activeProjectId,
  setActiveProjectId,
  setView,
  isDark,
  editingId,
  editingName,
  setEditingId,
  setEditingName,
  handleRename,
  deleteProject,
  addFileToProject,
  searchQuery
}) => {
  const filteredProjects = projects.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 overflow-auto py-2">
      {filteredProjects.map(p => (
        <div 
          key={p.id}
          onClick={() => { setActiveProjectId(p.id); }}
          className={cn(
            "group flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-all duration-200 text-[13px] rounded-md mx-1.5 my-0.5",
            p.id === activeProjectId 
              ? (isDark ? "bg-[#1f6feb]/15 text-[#58a6ff] font-medium" : "bg-blue-50 text-blue-700 font-medium") 
              : (isDark ? "hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9]" : "hover:bg-gray-100 text-gray-600 hover:text-gray-900")
          )}
        >
          <Folder className={cn("w-3.5 h-3.5", p.id === activeProjectId ? "text-blue-500" : "text-[#8b949e]")} />
          {editingId === p.id ? (
            <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                className={cn("flex-1 bg-transparent border-none outline-none text-xs", isDark ? "text-white" : "text-gray-900")}
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
              <button onClick={handleRename} className="text-green-500"><Check className="w-3 h-3" /></button>
              <button onClick={() => setEditingId(null)} className="text-red-500"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <>
              <span className="flex-1 truncate">{p.name}</span>
              <div className={cn("hidden items-center gap-1 shrink-0", isDark ? "text-gray-400" : "text-gray-500", "group-hover:flex")}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    addFileToProject(p.id, "new_file.cpp", "file");
                  }}
                  className={cn("p-1 rounded transition-colors", isDark ? "hover:bg-[#30363d] hover:text-white" : "hover:bg-gray-200 hover:text-gray-900")}
                  title="New File"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    addFileToProject(p.id, "new_folder", "folder");
                  }}
                  className={cn("p-1 rounded transition-colors", isDark ? "hover:bg-[#30363d] hover:text-white" : "hover:bg-gray-200 hover:text-gray-900")}
                  title="New Folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(p.id);
                    setEditingName(p.name);
                  }}
                  className={cn("p-1 rounded transition-colors", isDark ? "hover:bg-[#30363d] hover:text-white" : "hover:bg-gray-200 hover:text-gray-900")}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(p.id);
                  }}
                  className={cn("p-1 rounded transition-colors text-red-500 hover:text-red-400", isDark ? "hover:bg-[#30363d]" : "hover:bg-red-50")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};
