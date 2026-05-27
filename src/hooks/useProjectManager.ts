import { useState, useEffect, useMemo, useRef } from "react";
import { FileItem, Project } from "../types";
import axios from "axios";

const DEFAULT_CODE = `#include <iostream>
#include "utils.h"

using namespace std;

int main() {
    cout << get_message() << endl;
    return 0;
}
`;

const DEFAULT_HEADER = `#pragma once
#include <string>

inline std::string get_message() {
    return "Hello from multi-file project!";
}
`;

export function useProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [openTabsByProject, setOpenTabsByProject] = useState<Record<string, string[]>>({});
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);

  useEffect(() => {
    const savedTabs = localStorage.getItem("cpp-ide-tabs");
    if (savedTabs) {
      try {
        setOpenTabsByProject(JSON.parse(savedTabs));
      } catch (e) {}
    }
    const savedAutoSave = localStorage.getItem("cpp-ide-autosave");
    if (savedAutoSave !== null) {
      setIsAutoSaveEnabled(savedAutoSave === "true");
    }
  }, []);

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || null
  , [projects, activeProjectId]);

  const files = useMemo(() => activeProject?.files || [], [activeProject]);
  const activeFileId = activeProject?.activeFileId || null;
  const activeFile = useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);
  const code = activeFile?.content || "";

  const openTabs = useMemo(() => {
    if (!activeProjectId) return [];
    const tabs = openTabsByProject[activeProjectId] || [];
    if (activeFileId && !tabs.includes(activeFileId)) {
      const newTabs = [...tabs, activeFileId];
      // Note: This triggers a re-render and updates the state
      setTimeout(() => setOpenTabsForProject(activeProjectId, newTabs), 0);
      return newTabs;
    }
    return tabs;
  }, [activeProjectId, activeFileId, openTabsByProject]);

  const setOpenTabsForProject = (projectId: string, tabs: string[]) => {
    setOpenTabsByProject(prev => {
      const next = { ...prev, [projectId]: tabs };
      localStorage.setItem("cpp-ide-tabs", JSON.stringify(next));
      return next;
    });
  };

  const closeTab = (fileId: string) => {
    if (!activeProjectId) return;
    const tabs = openTabsByProject[activeProjectId] || [];
    const newTabs = tabs.filter(id => id !== fileId);
    setOpenTabsForProject(activeProjectId, newTabs);
    
    // If we closed the active file, switch to the last open tab
    if (activeFileId === fileId) {
      if (newTabs.length > 0) {
        setActiveFileId(newTabs[newTabs.length - 1]);
      } else {
        setActiveFileId(null);
      }
    }
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const savedProjects = localStorage.getItem("cpp-ide-projects");
        let localProjects: Project[] = [];
        try {
          if (savedProjects) localProjects = JSON.parse(savedProjects);
        } catch (e) {}

        const { data } = await axios.get("/api/projects");
        let serverProjects: Project[] = data || [];

        // Merge logic
        const mergedMap = new Map<string, Project>();
        for (const sp of serverProjects) {
          mergedMap.set(sp.id, sp);
        }
        for (const lp of localProjects) {
          const sp = mergedMap.get(lp.id);
          // If local has it and server doesn't, OR local is newer than server
          if (!sp || (lp.updatedAt && sp.updatedAt && lp.updatedAt > sp.updatedAt)) {
            mergedMap.set(lp.id, lp);
            // Optionally, we could schedule an immediate push to server here for those dirty projects.
          }
        }
        
        const mergedArray = Array.from(mergedMap.values()).sort((a, b) => ((b.updatedAt || 0) - (a.updatedAt || 0)));

        if (mergedArray.length > 0) {
          setProjects(mergedArray);
          setActiveProjectId(mergedArray[0].id);
        } else {
          createProject("Default Project");
        }
      } catch (err) {
        console.error("Failed to load projects", err);
        // Fallback or offline support
        const savedProjects = localStorage.getItem("cpp-ide-projects");
        if (savedProjects) {
          try {
            const parsed = JSON.parse(savedProjects);
            if (parsed.length > 0) {
              setProjects(parsed);
              setActiveProjectId(parsed[0].id);
            } else {
              createProject("Default Project", true);
            }
          } catch (e) {
            createProject("Default Project", true);
          }
        } else {
          createProject("Default Project", true);
        }
      } finally {
        setIsLoaded(true);
      }
    };
    loadProjects();
  }, []);

  const toggleAutoSave = () => {
    setIsAutoSaveEnabled(prev => {
      const next = !prev;
      localStorage.setItem("cpp-ide-autosave", String(next));
      return next;
    });
  };

  // Auto-save debounced
  useEffect(() => {
    if (!isLoaded || !activeProject) return;

    // Save to server
    const saveTimer = setTimeout(() => {
      if (isAutoSaveEnabled) {
        axios.post("/api/projects", activeProject).catch(console.error);
      }
    }, 1000);

    // Also backup to localStorage
    localStorage.setItem("cpp-ide-projects", JSON.stringify(projects));

    return () => clearTimeout(saveTimer);
  }, [projects, activeProjectId, isLoaded, activeProject, isAutoSaveEnabled]);

  const setFiles = (newFiles: FileItem[] | ((prev: FileItem[]) => FileItem[])) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        const updatedFiles = typeof newFiles === 'function' ? newFiles(p.files) : newFiles;
        return { ...p, files: updatedFiles, updatedAt: Date.now() };
      }
      return p;
    }));
  };

  const setCode = (newCode: string) => {
    if (!activeFileId) return;
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: newCode } : f));
  };

  const setActiveFileId = (id: string | null) => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, activeFileId: id, updatedAt: Date.now() } : p));
  };

  const createProject = (name: string, skipSave = false) => {
    const defaultFiles: FileItem[] = [
      { id: Math.random().toString(36).substr(2, 9), name: 'main.cpp', content: DEFAULT_CODE, type: 'file', parentId: null },
      { id: Math.random().toString(36).substr(2, 9), name: 'utils.h', content: DEFAULT_HEADER, type: 'file', parentId: null },
      { id: Math.random().toString(36).substr(2, 9), name: 'src', content: '', type: 'folder', parentId: null, isOpen: true },
    ];
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: name,
      files: defaultFiles,
      activeFileId: defaultFiles[0].id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
  };

  const deleteProjectFromBackend = async (id: string) => {
    try {
      await axios.delete(`/api/projects/${id}`);
    } catch(err) {
      console.error(err);
    }
  };

  const renameProjectFromBackend = async (id: string, name: string) => {
     setProjects(prev => prev.map(p => p.id === id ? { ...p, name: name } : p));
  };

  const removeTabsIfDeleted = (deletedIds: string[]) => {
    if (!activeProjectId) return;
    const tabs = openTabsByProject[activeProjectId] || [];
    const newTabs = tabs.filter(id => !deletedIds.includes(id));
    if (newTabs.length !== tabs.length) {
      setOpenTabsForProject(activeProjectId, newTabs);
    }
  };

  const addFileToProject = (projectId: string, name: string, type: 'file' | 'folder', content = '') => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const newItem: FileItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: name,
          content: content,
          type: type,
          parentId: null
        };
        if (type === 'folder') newItem.isOpen = true;
        return { ...p, files: [...p.files, newItem] };
      }
      return p;
    }));
  };

  return {
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    activeFile,
    code,
    setCode,
    createProject,
    deleteProjectFromBackend,
    renameProjectFromBackend,
    addFileToProject,
    DEFAULT_CODE,
    DEFAULT_HEADER,
    isLoaded,
    openTabs,
    closeTab,
    removeTabsIfDeleted,
    isAutoSaveEnabled,
    toggleAutoSave
  };
}
