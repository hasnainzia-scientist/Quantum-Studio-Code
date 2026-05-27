import React from "react";
import { Folder, File, ChevronRight, ChevronDown, FilePlus, FolderPlus, Edit2, Trash2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FileItem } from "../types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileTreeItemProps {
  item: FileItem;
  depth?: number;
  files: FileItem[];
  activeFileId: string | null;
  editingId: string | null;
  editingName: string;
  toggleFolder: (id: string) => void;
  setActiveFileId: (id: string) => void;
  createFile: (parentId: string | null) => void;
  createFolder: (parentId: string | null) => void;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  deleteItem: (id: string) => void;
  isDark: boolean;
  renameItem: (id: string) => void;
  searchQuery?: string;
  onMoveItem?: (draggedId: string, targetId: string) => void;
}

export const FileTreeItem: React.FC<FileTreeItemProps> = ({ 
  item, 
  depth = 0,
  files,
  activeFileId,
  editingId,
  editingName,
  toggleFolder,
  setActiveFileId,
  createFile,
  createFolder,
  setEditingId,
  setEditingName,
  deleteItem,
  isDark,
  renameItem,
  searchQuery,
  onMoveItem
}) => {
  const isEditing = editingId === item.id;
  const isActive = activeFileId === item.id;
  // Disable child rendering when searching flat
  const children = searchQuery ? [] : files.filter(f => f.parentId === item.id);

  const isAncestorOfActive = () => {
    if (item.type !== 'folder' || !activeFileId) return false;
    let currentId = activeFileId;
    while (currentId) {
      const parent = files.find(f => f.id === currentId)?.parentId;
      if (parent === item.id) return true;
      currentId = parent || null;
    }
    return false;
  };

  const isActiveFolder = isAncestorOfActive();

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", item.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== item.id && onMoveItem) {
      onMoveItem(draggedId, item.id);
    }
  };

  return (
    <div className="flex flex-col relative w-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div 
        draggable
        onDragStart={handleDragStart}
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-all duration-200 text-[13px] rounded-md mx-1.5 my-0.5 relative outline-none",
          isActive && item.type === 'file' 
            ? (isDark ? "bg-[#1f6feb]/15 text-[#58a6ff] font-medium" : "bg-blue-50 text-blue-700 font-medium") 
            : isActiveFolder 
            ? (isDark ? "bg-[#30363d]/30 text-[#e6edf3] font-medium" : "bg-gray-100/60 text-gray-900 font-medium")
            : (isDark ? "hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9]" : "hover:bg-gray-100 text-gray-600 hover:text-gray-900")
        )}
        style={{ paddingLeft: (searchQuery ? 0 : depth) * 14 + 10 }}
        onClick={() => {
          if (item.type === 'folder') toggleFolder(item.id);
          else setActiveFileId(item.id);
        }}
      >
        {isActive && item.type === 'file' && (
          <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-blue-600 dark:bg-[#58a6ff] rounded-r-md transition-all" />
        )}
        
        {item.type === 'folder' ? (
          item.isOpen ? <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", isActiveFolder && "text-blue-500")} /> : <ChevronRight className={cn("w-4 h-4 shrink-0 transition-transform", isActiveFolder && "text-blue-500")} />
        ) : (
          <div className="w-4 h-4 shrink-0" />
        )}
        {item.type === 'folder' ? (
          <Folder className={cn("w-4 h-4", isActiveFolder ? "text-blue-500 fill-blue-500/20" : "text-blue-400")} />
        ) : (
          <File className={cn("w-4 h-4", isActive ? "text-blue-500" : "text-gray-400")} />
        )}
        {isEditing ? (
          <input
            autoFocus
            className={cn("bg-transparent outline-none border-b border-blue-500 w-full font-mono")}
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') renameItem(item.id);
              if (e.key === 'Escape') setEditingId(null);
            }}
            onBlur={() => renameItem(item.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1">{item.name}</span>
        )}
        <div className={cn("hidden items-center gap-1 shrink-0", isDark ? "text-gray-400" : "text-gray-500", "group-hover:flex")}>
           {item.type === 'folder' && (
             <>
               <button onClick={(e) => { e.stopPropagation(); createFile(item.id); }} className={cn("p-1 rounded transition-colors", isDark ? "hover:bg-[#30363d] hover:text-white" : "hover:bg-gray-200 hover:text-gray-900")}><FilePlus className="w-3.5 h-3.5" /></button>
               <button onClick={(e) => { e.stopPropagation(); createFolder(item.id); }} className={cn("p-1 rounded transition-colors", isDark ? "hover:bg-[#30363d] hover:text-white" : "hover:bg-gray-200 hover:text-gray-900")}><FolderPlus className="w-3.5 h-3.5" /></button>
             </>
           )}
           <button onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditingName(item.name); }} className={cn("p-1 rounded transition-colors", isDark ? "hover:bg-[#30363d] hover:text-white" : "hover:bg-gray-200 hover:text-gray-900")}><Edit2 className="w-3.5 h-3.5" /></button>
           <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className={cn("p-1 rounded transition-colors text-red-500 hover:text-red-400", isDark ? "hover:bg-[#30363d]" : "hover:bg-red-50")}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {item.type === 'folder' && item.isOpen && (
        <div className="flex flex-col relative w-full">
          {children.map(child => (
            <FileTreeItem 
              key={child.id} 
              item={child} 
              depth={depth + 1}
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
              renameItem={renameItem}
              searchQuery={searchQuery}
              onMoveItem={onMoveItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};
