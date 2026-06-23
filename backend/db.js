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

      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,
        cohort TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score);
      CREATE INDEX IF NOT EXISTS idx_scores_play_date ON scores(play_date);
      CREATE INDEX IF NOT EXISTS idx_tournament_scores_tid ON tournament_scores(tournament_id);
      CREATE INDEX IF NOT EXISTS idx_tournament_scores_user_id ON tournament_scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_tournament_scores_score ON tournament_scores(score);
      CREATE INDEX IF NOT EXISTS idx_users_cohort ON users(cohort);
    `);
    
    // Initialize users table with COHORT_202604 data if empty
    try {
      const userCount = await db.get(`SELECT COUNT(*) as count FROM users`);
      if (userCount.count === 0) {
        const COHORT_202604 = {
          CL: [3319, 5905, 5906, 5907, 5908, 5909, 5910, 5911, 5912, 5913, 5914, 5915, 5916, 5917, 5918, 5919, 5920, 5921, 5922, 5923, 5924, 5944, 5964, 5980, 5981],
          JAVA: [5887, 5888, 5889, 5890, 5891, 5892, 5893, 5894, 5895, 5896, 5897, 5898, 5899, 5900, 5901, 5902, 5903, 5904, 5961],
          ML: [5925, 5926, 5927, 5928, 5929, 5930, 5931, 5932, 5933, 5934, 5935, 5936, 5937, 5938, 5939, 5940, 5941, 5942, 5943, 5962, 5963],
          QA: [5945, 5946, 5947, 5948, 5949, 5950, 5951, 5978, 5979, 5982],
          FR: [5952, 5953, 5954, 5955, 5956, 5957, 5958, 5959, 5960]
        };
        await db.run('BEGIN TRANSACTION');
        const stmt = await db.prepare(`INSERT INTO users (user_id, job_type, cohort) VALUES (?, ?, ?)`);
        for (const [job, ids] of Object.entries(COHORT_202604)) {
          for (const id of ids) {
            await stmt.run([id.toString(), job, '202604']);
          }
        }
        await stmt.finalize();
        await db.run('COMMIT');
        console.log('Initialized users table with COHORT_202604 data');
      }
    } catch (err) {
      console.error("Failed to initialize users table:", err);
    }
    
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
