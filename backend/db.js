import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'database.sqlite');

let dbPromise = null;

export async function getDb() {
  if (dbPromise) return dbPromise;

  // Ensure data directory exists
  try {
    await fs.mkdir(dbDir, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }

  dbPromise = open({
    filename: dbPath,
    driver: sqlite3.Database
  }).then(async (db) => {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score REAL NOT NULL,
        play_date TEXT NOT NULL
      )
    `);
    return db;
  });

  return dbPromise;
}
