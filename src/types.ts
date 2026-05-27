export interface FileItem {
  id: string;
  name: string;
  content: string;
  type: "file" | "folder";
  parentId: string | null;
  isOpen?: boolean;
}

export interface Project {
  id: string;
  name: string;
  files: FileItem[];
  activeFileId: string | null;
  createdAt: number;
  updatedAt?: number;
}
