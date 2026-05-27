import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL;
const PROJECT_FS_DIR = isVercel ? '/tmp/user_projects' : path.join(process.cwd(), 'user_projects');

export async function syncProjectToFS(projectId: string) {
  const projectInfo = db.prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as any;
  if (!projectInfo) return '';
  const dirName = projectInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + projectId.substring(0, 8);
  const repoDir = path.join(PROJECT_FS_DIR, dirName);
  
  if (!existsSync(repoDir)) {
    await fs.mkdir(repoDir, { recursive: true });
  }

  // Get all files for the project
  const files = db.prepare("SELECT * FROM files WHERE projectId = ? AND type = 'file'").all(projectId) as any[];
  const folders = db.prepare("SELECT * FROM files WHERE projectId = ? AND type = 'folder'").all(projectId) as any[];

  // Helper to get full path
  function getFullPath(fileId: string): string {
    const file = [...files, ...folders].find(f => f.id === fileId);
    if (!file) return '';
    if (file.parentId) {
      const parentPath = getFullPath(file.parentId);
      return path.join(parentPath, file.name);
    }
    return file.name;
  }

  // Clear existing working directory files (except .git)
  const existingFiles = await fs.readdir(repoDir);
  for (const file of existingFiles) {
    if (file !== '.git') {
      await fs.rm(path.join(repoDir, file), { recursive: true, force: true });
    }
  }

  // Write files
  for (const file of files) {
    const fullPath = getFullPath(file.id);
    const absolutePath = path.join(repoDir, fullPath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.content || '');
  }

  return repoDir;
}

export async function syncFSToProject(projectId: string) {
  const projectInfo = db.prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as any;
  if (!projectInfo) return;
  const dirName = projectInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + projectId.substring(0, 8);
  const repoDir = path.join(PROJECT_FS_DIR, dirName);
  if (!existsSync(repoDir)) return;

  // Read all files recursively
  const allFsFiles: { path: string, content: string, isDir: boolean }[] = [];
  async function readDirTree(dir: string, relPath: string = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git') continue;
      
      const resPath = path.resolve(dir, entry.name);
      const newRelPath = path.join(relPath, entry.name);
      
      if (entry.isDirectory()) {
        allFsFiles.push({ path: newRelPath, content: '', isDir: true });
        await readDirTree(resPath, newRelPath);
      } else {
        const content = await fs.readFile(resPath, 'utf8');
        allFsFiles.push({ path: newRelPath, content, isDir: false });
      }
    }
  }

  await readDirTree(repoDir);

  // We need to update DB. It's tricky to map paths back to IDs perfectly while keeping IDs.
  // Simplest: Generate new IDs for everything not in root, or try to match paths.
  
  const existingFiles = db.prepare('SELECT * FROM files WHERE projectId = ?').all(projectId) as any[];
  const existingPathMap = new Map<string, any>();
  
  function getFullPath(f: any): string {
    if (f.parentId) {
      const parent = existingFiles.find(ex => ex.id === f.parentId);
      if (parent) return path.join(getFullPath(parent), f.name);
    }
    return f.name;
  }
  
  existingFiles.forEach(f => {
    existingPathMap.set(getFullPath(f), f);
  });

  const tx = db.transaction(() => {
     // First, let's build the new hierarchy
     // We will clear existing files and insert the new ones from FS to avoid orphans
     db.prepare('DELETE FROM files WHERE projectId = ?').run(projectId);

     const folderMap = new Map<string, string>(); // path -> id

     const insertStmt = db.prepare(`
       INSERT INTO files (id, projectId, name, content, type, parentId)
       VALUES (?, ?, ?, ?, ?, ?)
     `);

     // Sort entries so folders come first
     allFsFiles.sort((a, b) => a.path.length - b.path.length);

     for (const fsf of allFsFiles) {
       const existing = existingPathMap.get(fsf.path);
       const id = existing ? existing.id : uuidv4();
       
       const parsed = path.parse(fsf.path);
       const parentPath = parsed.dir;
       const parentId = parentPath ? folderMap.get(parentPath) || null : null;

       if (fsf.isDir) {
          folderMap.set(fsf.path, id);
          insertStmt.run(id, projectId, parsed.base, null, 'folder', parentId);
       } else {
          insertStmt.run(id, projectId, parsed.base, fsf.content, 'file', parentId);
       }
     }
  });
  
  tx();
}

export function getGit(projectId: string): SimpleGit {
  const projectInfo = db.prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as any;
  const dirName = projectInfo ? projectInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + projectId.substring(0, 8) : projectId;
  const repoDir = path.join(PROJECT_FS_DIR, dirName);
  return simpleGit(repoDir);
}
