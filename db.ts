import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL;
const dbDir = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'ide.db'));
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    activeFileId TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT,
    type TEXT NOT NULL,
    parentId TEXT,
    isOpen INTEGER DEFAULT 0,
    FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

export default db;
