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
    await db.exec(`PRAGMA journal_mode = WAL;`);
    await db.exec(`PRAGMA busy_timeout = 5000;`);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score REAL NOT NULL,
        play_date TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tournament_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        score REAL NOT NULL,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
      );

      CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score);
      CREATE INDEX IF NOT EXISTS idx_scores_play_date ON scores(play_date);
      CREATE INDEX IF NOT EXISTS idx_tournament_scores_tid ON tournament_scores(tournament_id);
      CREATE INDEX IF NOT EXISTS idx_tournament_scores_user_id ON tournament_scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_tournament_scores_score ON tournament_scores(score);
    `);
    
    // Add job_type column for backward compatibility
    try {
      await db.exec(`ALTER TABLE scores ADD COLUMN job_type TEXT DEFAULT ''`);
    } catch (err) {
      // Ignore error if column already exists
    }

    try {
      await db.exec(`ALTER TABLE tournament_scores ADD COLUMN job_type TEXT DEFAULT ''`);
    } catch (err) {
      // Ignore error if column already exists
    }

    return db;
  });

  return dbPromise;
}
