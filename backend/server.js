import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { CATEGORIES, WORDS_BY_GENRE, setCustomWords } from './words.js';
import { validateCustomWord } from './customWords.js';
import { getHiddenCpuCategories, setCpuCategoryVisible } from './cpuCategories.js';
import {
  startScheduler, describeSchedule, validateSchedule, jstKey, prevOccurrence,
} from './scheduler.js';
import {
  initNameCrypto, hasNameKey, encryptName, isEncryptedName,
} from './nameCrypto.js';
import { getTournamentScores, getTopScores, monthsAgoDate } from './tournamentBoard.js';
import { bestPerPlayer, addRecord } from './cpuRankings.js';
import {
  CheerHub, loadCheerSettings, validateCheerSettings, publicCheerSettings, rankChangeTelop,
} from './cheer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Security: Security Headers ---
app.use(helmet());

// --- 接続元 IP ---
// 通信は「ブラウザ → edge-proxy → frontend の nginx → このサーバ」と届く。
// frontend の nginx は X-Forwarded-For の末尾に接続元の実 IP を付けて渡すので、手前の 1 段（その nginx）だけを信頼する。
// これがないと req.ip が全員「nginx コンテナの IP」になり、下の回数制限を利用者全員で分け合ってしまう。
// （このサーバはホストにポートを公開しておらず、届くのは frontend の nginx からだけ）
app.set('trust proxy', 1);

// --- Security: Rate Limiting ---
// 接続元 IP ごとに 1 分あたりの回数を制限する。
// 社内 Wi-Fi からは全員が同じ IP に見えるため、上限はその IP からの合計で足りる値にしている
// （CPU BATTLE はジャンルを選ぶたびに 12 回、1 プレイ終えるたびに 2 回 /api を呼ぶ。200 人規模のイベントでも収まる値）
const API_RATE_LIMIT_PER_MINUTE = 3000;
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: API_RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

// Apply rate limiting to all /api/ routes
app.use('/api/', apiLimiter);

// --- Security: CORS制限 ---
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost';

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ["GET", "POST"]
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// --- ランキング永続化ロジック ---
const RANKINGS_FILE = path.join(__dirname, 'data', 'rankings.json');

let rankingsCache = null;

async function getRankingsData() {
  if (rankingsCache) return rankingsCache;
  try {
    const data = await fs.readFile(RANKINGS_FILE, 'utf-8');
    rankingsCache = JSON.parse(data);
    return rankingsCache;
  } catch (err) {
    if (err.code === 'ENOENT') {
      rankingsCache = {};
      return rankingsCache; // ファイルがない場合は空オブジェクトを返す
    }
    console.error("Error reading rankings file:", err);
    return {};
  }
}

let rankingsLock = Promise.resolve();

async function saveRankingsData(data) {
  try {
    rankingsCache = data;
    await fs.mkdir(path.dirname(RANKINGS_FILE), { recursive: true });
    const tempFile = RANKINGS_FILE + '.tmp';
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempFile, RANKINGS_FILE);
  } catch (err) {
    console.error("Error saving rankings file:", err);
  }
}

// --- Ranking API Endpoints ---
app.get('/api/rankings/:genre/:level', async (req, res) => {
  const { genre, level } = req.params;
  const rankings = await getRankingsData();
  const key = `${genre}_lv${level}`;
  // 同じ社員番号は一番良い記録だけ（以前に保存された重複もここで 1 行にまとめる）
  res.json(bestPerPlayer(rankings[key]));
});

app.post('/api/rankings/:genre/:level', async (req, res) => {
  const { genre, level } = req.params;
  const { username, time, jobType, score } = req.body;
  
  if (!username || typeof time !== 'number') {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  const safeName = sanitizePlayerName(username);
  if (!safeName) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  rankingsLock = rankingsLock.then(async () => {
    try {
      const rankings = await getRankingsData();
      const key = `${genre}_lv${level}`;
      // 同じ社員番号は一番良い記録だけを残して TOP 30 を維持する
      rankings[key] = addRecord(rankings[key],
        { username: safeName, time, date: new Date().toISOString(), jobType: jobType || '', score: score || 0 });

      await saveRankingsData(rankings);
      
      res.json(rankings[key]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }).catch(e => {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
  });
});

// --- Score API Endpoints (SQLite) ---
import { getDb } from './db.js';

app.post('/api/scores', async (req, res) => {
  const { user_id, score, jobType } = req.body;
  const safeId = sanitizePlayerName(user_id);
  
  if (!safeId || typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    const db = await getDb();
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    await db.run(
      'INSERT INTO scores (user_id, score, play_date, job_type) VALUES (?, ?, ?, ?)',
      [safeId, score, dateStr, jobType || '']
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving score:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/scores/top', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT user_id, MAX(job_type) as job_type, MAX(score) as score 
      FROM scores 
      GROUP BY user_id 
      ORDER BY score DESC 
      LIMIT 30
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching top scores:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/scores/admin', async (req, res) => {
  const { min_user, max_user, start_date, end_date, job_type } = req.query;
  
  if (!min_user || !max_user) {
    return res.status(400).json({ error: 'Missing range parameters' });
  }

  try {
    const db = await getDb();
    let query = `
      SELECT id, user_id, job_type, play_date as date, score 
      FROM scores 
      WHERE user_id >= ? AND user_id <= ?
    `;
    const params = [min_user, max_user];

    if (start_date) {
      query += ` AND play_date >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND play_date <= ?`;
      params.push(end_date);
    }
    if (job_type) {
      query += ` AND job_type = ?`;
      params.push(job_type);
    }

    query += `
      ORDER BY id ASC
    `;

    const rows = await db.all(query, params);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching scores:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/tournaments', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM tournaments ORDER BY id DESC`);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching tournaments:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/tournaments/scores/admin', async (req, res) => {
  const { min_user, max_user, start_date, end_date, job_type, start_tournament_id, end_tournament_id } = req.query;
  
  if (!min_user || !max_user) {
    return res.status(400).json({ error: 'Missing range parameters' });
  }

  try {
    const db = await getDb();
    let query = `
      SELECT 
        ts.id, 
        ts.tournament_id, 
        t.name as tournament_name, 
        t.date as tournament_date, 
        ts.user_id, 
        ts.job_type, 
        ts.score 
      FROM tournament_scores ts
      JOIN tournaments t ON ts.tournament_id = t.id
      WHERE CAST(ts.user_id AS INTEGER) >= ? AND CAST(ts.user_id AS INTEGER) <= ?
    `;
    const params = [min_user, max_user];

    if (start_date) {
      query += ` AND t.date >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND t.date <= ?`;
      params.push(end_date);
    }
    if (job_type) {
      query += ` AND ts.job_type = ?`;
      params.push(job_type);
    }
    if (start_tournament_id && start_tournament_id !== 'all') {
      query += ` AND ts.tournament_id >= ?`;
      params.push(start_tournament_id);
    }
    if (end_tournament_id && end_tournament_id !== 'all') {
      query += ` AND ts.tournament_id <= ?`;
      params.push(end_tournament_id);
    }

    query += ` ORDER BY t.id ASC, ts.score DESC`;

    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching tournament scores for admin:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- ユーザー管理API ---

// ユーザー一覧取得
app.get('/api/users', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT user_id, job_type, cohort FROM users ORDER BY CAST(user_id AS INTEGER) ASC, user_id ASC`);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ひな形CSVダウンロード
app.get('/api/users/template', (req, res) => {
  const csvContent = "user_id,job_type,cohort\n5905,CL,202604\n5887,JAVA,202604\n5925,ML,202604\n";
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=users_template.csv');
  res.status(200).send(csvContent);
});

// 個別ユーザー登録（追加・更新）
app.post('/api/users', async (req, res) => {
  const { user_id, job_type, cohort } = req.body;
  if (!user_id || !job_type || !cohort) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const cleanUserId = user_id.toString().trim();
  const cleanJobType = job_type.toString().trim();
  const cleanCohort = cohort.toString().trim();

  // 単純なバリデーション
  if (!/^[0-9a-zA-Z_-]+$/.test(cleanUserId)) {
    return res.status(400).json({ error: 'Invalid user_id format' });
  }

  try {
    const db = await getDb();
    await db.run(
      `INSERT OR REPLACE INTO users (user_id, job_type, cohort) VALUES (?, ?, ?)`,
      [cleanUserId, cleanJobType, cleanCohort]
    );
    res.json({ success: true, user: { user_id: cleanUserId, job_type: cleanJobType, cohort: cleanCohort } });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 複数ユーザー一括登録（インポート）
app.post('/api/users/import', async (req, res) => {
  const { users } = req.body;
  if (!users || !Array.isArray(users)) {
    return res.status(400).json({ error: 'Invalid or missing users list' });
  }

  try {
    const db = await getDb();
    await db.run('BEGIN TRANSACTION');
    const stmt = await db.prepare(`INSERT OR REPLACE INTO users (user_id, job_type, cohort) VALUES (?, ?, ?)`);
    
    let count = 0;
    for (const u of users) {
      const uid = u.user_id?.toString().trim();
      const job = u.job_type?.toString().trim();
      const coh = u.cohort?.toString().trim();
      
      if (uid && job && coh) {
        await stmt.run([uid, job, coh]);
        count++;
      }
    }
    await stmt.finalize();
    await db.run('COMMIT');
    res.json({ success: true, count });
  } catch (err) {
    console.error("Error importing users:", err);
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (rbErr) {
      console.error("Rollback failed:", rbErr);
    }
    res.status(500).json({ error: 'Database error during import' });
  }
});

// ユーザー削除
app.delete('/api/users/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const db = await getDb();
    await db.run(`DELETE FROM users WHERE user_id = ?`, [user_id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ヘルスチェック用
app.get('/', (req, res) => {
  res.send('Server is running');
});

const PORT = process.env.PORT || 3001;

import { GameRoom } from './gameLogic.js';

// --- Security: 入力バリデーション ---
function sanitizePlayerName(name) {
  if (typeof name !== 'string' && typeof name !== 'number') return null;
  const str = String(name).trim();
  // Allow only 1 to 7 digits (1 - 9999999)
  if (/^[0-9]{1,7}$/.test(str)) {
    return str;
  }
  return null;
}

// 氏名（表示名）: 前後の空白を除いて 1〜20 文字。改行などの制御文字と < > は受け付けない
const DISPLAY_NAME_MAX = 20;
function sanitizeDisplayName(name) {
  if (typeof name !== 'string') return null;
  const str = name.normalize('NFC').replace(/\s+/g, ' ').trim();
  const len = [...str].length;
  if (len < 1 || len > DISPLAY_NAME_MAX) return null;
  if (/[\u0000-\u001f\u007f<>]/.test(str)) return null;
  return str;
}

function isValidRoomId(roomId) {
  return typeof roomId === 'string' && /^([1-9]|10)$/.test(roomId);
}

function isValidTypedChar(char) {
  return typeof char === 'string' && char.length === 1;
}

// --- Security: レート制限（typing用） ---
const typingTimestamps = new Map(); // socketId -> lastTimestamp
const TYPING_RATE_LIMIT_MS = 30; // 最小30ms間隔（秒間33打鍵まで許可）

function isRateLimited(socketId) {
  const now = Date.now();
  const last = typingTimestamps.get(socketId) || 0;
  if (now - last < TYPING_RATE_LIMIT_MS) {
    return true;
  }
  typingTimestamps.set(socketId, now);
  return false;
}

// シンプルなルーム管理 (複数ルーム対応)
const rooms = {};

// 固定10ルームを初期化
for (let i = 1; i <= 10; i++) {
  const roomId = i.toString();
  const room = new GameRoom(roomId);
  room.setGenre(CATEGORIES.BUSINESS);
  rooms[roomId] = room;
}

// --- Tournament Management ---
let tournamentState = {
  status: 'waiting', // waiting, active, finished
  tournamentId: null,
  endTime: null,
  cpuLevel: 5,
  participants: {} // userId -> maxScore
};

let tournamentTimer = null;
let tournamentOneMinuteTimer = null;
const tournamentLobbyPlayers = {}; // socketId -> playerName

// --- にぎやかし（実況テロップ・スタンプ・拍手・スポットライト・盛り上がりメーター） ---
// 設定は管理画面から変える（DB の app_settings に保存）。参加者の画面と管理画面へ配る
let cheerSettings = loadCheerSettings(null);
const CHEER_ROOMS = ['tournament_lobby', 'admin_room'];
const cheer = new CheerHub({
  emit: (event, payload) => io.to(CHEER_ROOMS).emit(event, payload),
  getSettings: () => cheerSettings,
});

let lobbyUpdateTimer = null;
function emitTournamentLobbyUpdate() {
  if (lobbyUpdateTimer) return;
  lobbyUpdateTimer = setTimeout(() => {
    lobbyUpdateTimer = null;
    io.to('admin_room').emit('tournamentLobbyUpdate', {
      count: Object.keys(tournamentLobbyPlayers).length,
      players: Object.values(tournamentLobbyPlayers).map(lobbyPlayerLabel).slice(0, 20)
    });
  }, 500);
}

/**
 * イベント（5 分間）を開始する。手動開始（管理画面のボタン）と自動開始（予約）で共通。
 * 戻り値: 'started' | 'skipped_active'（すでに開催中）
 */
async function startTournament() {
  if (tournamentState.status === 'active') return 'skipped_active';

  tournamentState.status = 'active';
  tournamentState.endTime = Date.now() + 5 * 60 * 1000; // 5 minutes
  tournamentState.participants = {};
  cheer.reset();

  // Create DB record
  try {
    const db = await getDb();
    const dateStr = new Date().toISOString().split('T')[0];
    const row = await db.get(`SELECT COUNT(*) as count FROM tournaments WHERE date = ?`, [dateStr]);
    const count = (row.count || 0) + 1;
    const name = `${dateStr} 第${count}回大会`;

    const result = await db.run('INSERT INTO tournaments (name, date) VALUES (?, ?)', [name, dateStr]);
    tournamentState.tournamentId = result.lastID;
  } catch(err) {
    console.error("Tournament creation error", err);
  }

  io.to('tournament_lobby').emit('tournamentStarted', { endTime: tournamentState.endTime });
  cheer.telop('start');

  if (tournamentTimer) clearTimeout(tournamentTimer);
  if (tournamentOneMinuteTimer) clearTimeout(tournamentOneMinuteTimer);
  tournamentOneMinuteTimer = setTimeout(() => {
    tournamentOneMinuteTimer = null;
    if (tournamentState.status === 'active') cheer.telop('oneMinute');
  }, 4 * 60 * 1000);

  tournamentTimer = setTimeout(async () => {
    tournamentState.status = 'finished';
    io.to('tournament_lobby').emit('tournamentFinished');

    // Save scores to DB
    if (tournamentState.tournamentId) {
      try {
        const db2 = await getDb();
        for (const [userId, data] of Object.entries(tournamentState.participants)) {
          await db2.run('INSERT INTO tournament_scores (tournament_id, user_id, score, job_type) VALUES (?, ?, ?, ?)', [tournamentState.tournamentId, userId, data.score, data.jobType || '']);
        }
      } catch (err) {
        console.error("Error saving tournament scores", err);
      }
    }

    // Delay resetting state to give clients time to see final ranking
    setTimeout(() => {
      tournamentState.status = 'waiting';
      tournamentState.tournamentId = null;
      tournamentState.endTime = null;
      tournamentState.cpuLevel = 5;
      tournamentState.participants = {};
    }, 5000);

  }, 5 * 60 * 1000); // 5 minutes

  return 'started';
}

// 画面に渡すイベントの状態
function tournamentStatePayload() {
  return { status: tournamentState.status, endTime: tournamentState.endTime, cpuLevel: tournamentState.cpuLevel };
}

let liveRankingUpdateTimer = null;
// 社員番号 → 氏名（参加時に本人が入力したもの）。リアルタイムランキングの表示用
const playerDisplayNames = new Map();

// 管理画面の待機室一覧用の表示（氏名があれば「氏名（社員番号）」）
function lobbyPlayerLabel(p) {
  return p.displayName ? `${p.displayName}（${p.name}）` : p.name;
}

// リアルタイムランキング（上位 100 件）。氏名が分かる人は氏名を付ける
function buildLiveRanking() {
  return Object.entries(tournamentState.participants)
    .map(([user_id, data]) => ({
      user_id, name: playerDisplayNames.get(user_id) || null,
      score: data.score, jobType: data.jobType, claps: cheer.clapsOf(user_id), claim: cheer.claimOf(user_id),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);
}

function emitTournamentLiveRanking() {
  if (liveRankingUpdateTimer) return;
  liveRankingUpdateTimer = setTimeout(() => {
    liveRankingUpdateTimer = null;
    // 管理画面（スポットライトを当てる人を選ぶ一覧）にも配る
    io.to(['tournament_lobby', 'admin_room']).emit('tournamentLiveRanking', buildLiveRanking());
  }, 500);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  let currentRoomId = null;

  // ロビーの最新状態を取得してクライアントに送信
  const sendLobbiesState = (targetSocket = io) => {
    const lobbies = Object.values(rooms).map(room => ({
      roomId: room.roomId,
      genre: room.genre,
      playerCount: Object.keys(room.players).length,
      players: Object.values(room.players).map(p => p.name),
      status: room.status
    }));
    targetSocket.emit('lobbiesState', lobbies);
  };

  // 接続時にロビー一覧を送信
  sendLobbiesState(socket);

  // CPU 対戦とイベントの問題はブラウザ側で選ぶので、追加された出題文も渡しておく
  socket.emit('customWords', customWords);
  socket.emit('cpuHiddenCategories', hiddenCpuCategories);

  // イベントへの参加（再接続したときも画面から送り直される）。
  // 新しい画面は ack（返事のコールバック）付きで送り、返事で今のイベント状態を受け取る。
  // 返事が来なければ画面側で接続し直して送り直す（通信が詰まって届かなかった場合の対策）。
  socket.on('joinTournament', (payload, ack) => {
    const { playerName, displayName, jobType } = payload || {};
    const reply = typeof ack === 'function' ? ack : null;
    const fail = (message) => {
      if (reply) reply({ error: message });
      else socket.emit('error', message);
    };
    const safeName = sanitizePlayerName(playerName);
    if (!safeName) {
      fail('Invalid player name.');
      return;
    }
    // 氏名（任意項目として受ける: 古い画面から氏名なしで参加した場合は社員番号で表示）
    let safeDisplayName = null;
    if (displayName !== undefined && displayName !== null && displayName !== '') {
      safeDisplayName = sanitizeDisplayName(displayName);
      if (!safeDisplayName) {
        fail('Invalid display name.');
        return;
      }
      playerDisplayNames.set(safeName, safeDisplayName);
      // 管理画面で後から見られるよう、暗号化して保存する（氏名はログに出さない）。
      // 鍵が無ければ保存しない（平文では保存しない）
      if (hasNameKey()) {
        getDb()
          .then(db => db.run(
            `INSERT INTO player_names (user_id, name, updated_at) VALUES (?, ?, datetime('now'))
             ON CONFLICT(user_id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
            [safeName, encryptName(safeName, safeDisplayName)]))
          .catch(err => console.error('Failed to save player name:', err.message));
      }
    }
    socket.join('tournament_lobby');
    tournamentLobbyPlayers[socket.id] = { name: safeName, displayName: safeDisplayName, jobType: jobType || '' };
    emitTournamentLobbyUpdate();
    emitTournamentLiveRanking();

    if (reply) reply(tournamentStatePayload());
    else socket.emit('tournamentState', tournamentStatePayload()); // 古い画面向け
  });

  // 待機中の画面が数秒おきに今のイベント状態を確かめる（開始の通知を取りこぼしても進めるように）
  socket.on('getTournamentState', (ack) => {
    if (typeof ack === 'function') ack(tournamentStatePayload());
  });

  socket.on('adminGetLobby', () => {
    socket.join('admin_room');
    socket.emit('tournamentLobbyUpdate', {
      count: Object.keys(tournamentLobbyPlayers).length,
      players: Object.values(tournamentLobbyPlayers).map(lobbyPlayerLabel).slice(0, 20)
    });
  });

  socket.on('adminStartTournament', async () => {
    await startTournament();
  });

  socket.on('getTournamentLiveRanking', () => {
    socket.emit('tournamentLiveRanking', buildLiveRanking());
  });

  // イベント画面の結果表（ニックネーム付き）。氏名を /api に出さないよう socket で渡す
  socket.on('getTournamentBoard', async (ack) => {
    if (typeof ack !== 'function') return;
    try {
      const db = await getDb();
      ack({
        allTime: await getTopScores(db),
        recent: await getTopScores(db, monthsAgoDate(3)),
      });
    } catch (err) {
      console.error('Error fetching tournament board:', err.message);
      ack({ allTime: [], recent: [] });
    }
  });

  socket.on('getTournamentScores', async (id, ack) => {
    if (typeof ack !== 'function') return;
    if (!Number.isInteger(id)) return ack([]);
    try {
      ack(await getTournamentScores(await getDb(), id));
    } catch (err) {
      console.error('Error fetching tournament scores:', err.message);
      ack([]);
    }
  });

  socket.on('tournamentUpdateScore', ({ playerName, score, jobType } = {}) => {
    const safeName = sanitizePlayerName(playerName);
    if (!safeName || tournamentState.status !== 'active') return;
    // スコアはテロップの文言にも入るので、数値だけを受け付ける
    if (typeof score !== 'number' || !Number.isFinite(score)) return;

    const currentMax = tournamentState.participants[safeName]?.score || 0;
    if (score > currentMax) {
      const before = { ...tournamentState.participants };
      tournamentState.participants[safeName] = { score, jobType: jobType || '' };
      emitTournamentLiveRanking();
      // 1 位の交代・3 位以内への浮上を実況テロップにする
      const change = rankChangeTelop(before, tournamentState.participants, safeName);
      if (change) {
        cheer.telop(change.key, {
          name: playerDisplayNames.get(safeName) || safeName, id: safeName, score: Math.round(score), rank: change.rank,
        });
      }
    } else {
      socket.emit('tournamentLiveRanking', buildLiveRanking());
    }
  });

  // --- にぎやかし ---
  // 画面を開いたときの設定とメーターの値
  socket.on('getCheerState', (ack) => {
    if (typeof ack !== 'function') return;
    ack({ settings: publicCheerSettings(cheerSettings), meter: cheer.meterState() });
  });

  // B. スタンプ（タイピングを終えた人の画面から）。イベント参加者が開催中に送ったものだけ数える
  socket.on('sendCheerStamp', (index) => {
    if (!tournamentLobbyPlayers[socket.id] || tournamentState.status !== 'active') return;
    cheer.stamp(socket.id, index);
  });

  // C. 宛先つき拍手。ランキングに載っている人にだけ送れる。自分には送れない
  socket.on('sendClap', (userId) => {
    const me = tournamentLobbyPlayers[socket.id];
    const target = sanitizePlayerName(userId);
    if (!me || !target || target === me.name || tournamentState.status !== 'active') return;
    if (!tournamentState.participants[target]) return;
    if (cheer.clap(socket.id, target) !== null) emitTournamentLiveRanking();
  });

  // F. 主張スタンプ（「自己ベスト更新！」など）。条件は確かめず、本人が押せば出す。ランキングのスコアの横に付く
  socket.on('sendClaim', (index) => {
    const me = tournamentLobbyPlayers[socket.id];
    if (!me || tournamentState.status !== 'active') return;
    const text = cheer.postClaim(socket.id, me.name, index);
    if (text === null) return;
    emitTournamentLiveRanking();
    cheer.telop('claim', { name: playerDisplayNames.get(me.name) || me.name, id: me.name, claim: text });
  });

  // 主張への「いいね」（1 つの主張に 1 人 1 回。もう一度押すと取り消し）。返事で押した後の状態を返す
  socket.on('likeClaim', (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const me = tournamentLobbyPlayers[socket.id];
    const { userId, seq } = payload || {};
    const target = sanitizePlayerName(userId);
    if (!me || !target || !Number.isInteger(seq) || tournamentState.status !== 'active') return reply(null);
    const r = cheer.toggleLike(socket.id, me.name, target, seq);
    if (r) emitTournamentLiveRanking();
    reply(r);
  });

  // D. スポットライト（管理画面から）。開催中のランキングに載っている人を選ぶ
  socket.on('adminSpotlight', (userId, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const target = sanitizePlayerName(userId);
    const data = target && tournamentState.participants[target];
    if (tournamentState.status !== 'active') return reply({ error: 'イベントの開催中だけ使えます。' });
    if (!data) return reply({ error: 'ランキングに載っている人を選んでください。' });
    if (!cheer.canSpotlight()) {
      return reply({ error: cheerSettings.spotlightEnabled ? '続けて使えません。3 秒ほどあけてください。' : 'スポットライトはオフになっています。' });
    }
    const ranking = buildLiveRanking();
    const rank = ranking.findIndex(r => r.user_id === target) + 1 || null;
    const name = playerDisplayNames.get(target) || null;
    io.to(CHEER_ROOMS).emit('cheerSpotlight', {
      user_id: target, name, jobType: data.jobType || '', score: data.score, rank, claps: cheer.clapsOf(target),
    });
    cheer.telop('spotlight', { name: name || target, id: target, score: Math.round(data.score), rank });
    reply({ ok: true });
  });

  socket.on('joinRoom', ({ roomId, playerName, jobType }) => {
    // --- Security: バリデーション ---
    if (!isValidRoomId(roomId)) {
      socket.emit('error', 'Invalid room ID.');
      return;
    }

    const safeName = sanitizePlayerName(playerName);
    if (!safeName) {
      socket.emit('error', 'Invalid player name. Max 12 characters, no special HTML.');
      return;
    }

    console.log(`Received joinRoom event from ${socket.id} with roomId: ${roomId}, playerName: ${safeName}`);

    if (!rooms[roomId]) {
      socket.emit('error', 'Room does not exist.');
      return;
    }

    const room = rooms[roomId];
    if (room.addPlayer(socket.id, safeName, jobType)) {
      socket.join(roomId);
      currentRoomId = roomId;
      io.to(roomId).emit('roomState', room.getState());
      console.log(`${safeName}(${socket.id}) successfully joined room ${roomId}`);
      sendLobbiesState();
    } else {
      console.log(`${safeName}(${socket.id}) failed to join room ${roomId} (full)`);
      socket.emit('error', 'Room is full.');
    }
  });

  socket.on('setReady', (isReady) => {
    // --- Security: Boolean検証 ---
    if (typeof isReady !== 'boolean') return;

    if (currentRoomId && rooms[currentRoomId]) {
      const room = rooms[currentRoomId];
      room.setPlayerReady(socket.id, isReady);
      io.to(currentRoomId).emit('roomState', room.getState());
    }
  });

  socket.on('changeGenre', ({ genre }) => {
    if (currentRoomId && rooms[currentRoomId]) {
      const room = rooms[currentRoomId];
      room.setGenre(genre);
      io.to(currentRoomId).emit('roomState', room.getState());
    }
  });

  socket.on('leaveRoom', () => {
    if (currentRoomId && rooms[currentRoomId]) {
      const room = rooms[currentRoomId];
      room.removePlayer(socket.id);
      socket.leave(currentRoomId);
      currentRoomId = null;
      io.to(room.roomId).emit('roomState', room.getState());
      sendLobbiesState();
    }
  });

  socket.on('startGame', () => {
    if (currentRoomId && rooms[currentRoomId]) {
      const room = rooms[currentRoomId];
      if (room.canStart() && room.status !== 'starting') {
        room.status = 'starting';
        io.to(currentRoomId).emit('roomState', room.getState());
        io.to(currentRoomId).emit('gameCountdown', 3);

        let count = 3;
        const interval = setInterval(() => {
          count--;
          if (count > 0) {
            io.to(currentRoomId).emit('gameCountdown', count);
          } else {
            clearInterval(interval);
            room.startGame();
            io.to(currentRoomId).emit('roomState', room.getState());
            io.to(currentRoomId).emit('gameStarted');
          }
        }, 1000);
      }
    }
  });

  socket.on('typing', (typedChar) => {
    // --- Security: 入力バリデーション + レート制限 ---
    if (!isValidTypedChar(typedChar)) return;
    if (isRateLimited(socket.id)) return;

    if (currentRoomId && rooms[currentRoomId]) {
      const room = rooms[currentRoomId];
      const result = room.handleTyping(socket.id, typedChar);

      if (result) {
        io.to(currentRoomId).emit('roomState', room.getState());

        socket.emit('typingResult', {
          success: result.success,
          wordCompleted: result.wordCompleted
        });

        if (result.wordCompleted && result.damageDealt > 0) {
          socket.to(currentRoomId).emit('takingDamage', {
            from: socket.id,
            damage: result.damageDealt
          });
        }
      }
    }
  });

  // 試合終了後のリセット(再戦用)
  socket.on('resetGame', () => {
    if (currentRoomId && rooms[currentRoomId]) {
      const room = rooms[currentRoomId];
      room.status = 'waiting';
      Object.values(room.players).forEach(p => {
        p.isReady = false;
        p.isWinner = false;
      });
      io.to(currentRoomId).emit('roomState', room.getState());
    }
  });

  socket.on('disconnect', () => {
    cheer.forget(socket.id);
    if (tournamentLobbyPlayers[socket.id]) {
      delete tournamentLobbyPlayers[socket.id];
      emitTournamentLobbyUpdate();
    }
    console.log(`User disconnected: ${socket.id}`);
    typingTimestamps.delete(socket.id);
    if (currentRoomId && rooms[currentRoomId]) {
      const room = rooms[currentRoomId];
      room.removePlayer(socket.id);
      io.to(currentRoomId).emit('roomState', room.getState());
      sendLobbiesState();
    }
  });
});

// --- 管理者用 API: 過去のイベントの最終ランキング（氏名付き） ---
// 氏名を含むので /api ではなく /admin-api（管理者 IP + Basic 認証の /admin/api/ からだけ届く）に置く
app.get('/admin-api/tournaments/:id/scores', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
  try {
    res.json(await getTournamentScores(await getDb(), id));
  } catch (err) {
    console.error('Error fetching tournament scores (admin):', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- 管理者用 API: イベントの毎週自動開始の予約 ---
// /admin-api はフロントの nginx が /admin/api/ としてだけ公開する（管理者 IP 制限 + Basic 認証）。
// /api と違い、外部から直接は届かない。
app.get('/admin-api/tournament-schedules', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM tournament_schedules ORDER BY day_of_week, hour, minute, id');
    const now = new Date();
    res.json(rows.map(r => describeSchedule(r, now)));
  } catch (err) {
    console.error('Error fetching schedules:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/admin-api/tournament-schedules', async (req, res) => {
  const s = {
    day_of_week: Number(req.body?.day_of_week),
    hour: Number(req.body?.hour),
    minute: Number(req.body?.minute),
  };
  if (!validateSchedule(s)) {
    return res.status(400).json({ error: '曜日・時刻の指定が正しくありません。' });
  }
  try {
    const db = await getDb();
    const dup = await db.get(
      'SELECT id FROM tournament_schedules WHERE day_of_week = ? AND hour = ? AND minute = ?',
      [s.day_of_week, s.hour, s.minute]
    );
    if (dup) return res.status(409).json({ error: '同じ曜日・時刻の予約がすでにあります。' });
    // 登録した時点で直近の回が実行対象にならないよう、直前の回を処理済みとして記録しておく
    const lastKey = jstKey(prevOccurrence(s, new Date()));
    const result = await db.run(
      'INSERT INTO tournament_schedules (day_of_week, hour, minute, enabled, last_run_key) VALUES (?, ?, ?, 1, ?)',
      [s.day_of_week, s.hour, s.minute, lastKey]
    );
    const row = await db.get('SELECT * FROM tournament_schedules WHERE id = ?', [result.lastID]);
    res.status(201).json(describeSchedule(row, new Date()));
  } catch (err) {
    console.error('Error creating schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/admin-api/tournament-schedules/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || typeof req.body?.enabled !== 'boolean') {
    return res.status(400).json({ error: 'Invalid request.' });
  }
  try {
    const db = await getDb();
    const row = await db.get('SELECT * FROM tournament_schedules WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found.' });
    // 再開したときに、止めていた間の直近の回をさかのぼって実行しないようにする
    const lastKey = req.body.enabled ? jstKey(prevOccurrence(row, new Date())) : row.last_run_key;
    await db.run('UPDATE tournament_schedules SET enabled = ?, last_run_key = ? WHERE id = ?',
      [req.body.enabled ? 1 : 0, lastKey, id]);
    const updated = await db.get('SELECT * FROM tournament_schedules WHERE id = ?', [id]);
    res.json(describeSchedule(updated, new Date()));
  } catch (err) {
    console.error('Error updating schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/admin-api/tournament-schedules/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
  try {
    const db = await getDb();
    await db.run('DELETE FROM tournament_schedules WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 管理者用 API: 出題文の追加 ---
let customWords = [];

// DB の内容をサーバの出題に反映し、開いている画面にも配る
async function reloadCustomWords() {
  const db = await getDb();
  customWords = await db.all('SELECT id, genre, text, ruby, created_at FROM custom_words ORDER BY id DESC');
  setCustomWords(customWords);
  io.emit('customWords', customWords);
}

app.get('/admin-api/custom-words', (req, res) => {
  res.json(customWords);
});

app.post('/admin-api/custom-words', async (req, res) => {
  const genre = req.body?.genre;
  if (typeof genre !== 'string' || !Object.hasOwn(WORDS_BY_GENRE, genre)) {
    return res.status(400).json({ error: 'ジャンルを選択してください。' });
  }
  const word = validateCustomWord({ text: req.body?.text, ruby: req.body?.ruby });
  if (!word.ok) return res.status(400).json({ error: word.error });
  if (WORDS_BY_GENRE[genre].some(w => w.text === word.text)) {
    return res.status(409).json({ error: 'このジャンルに同じ問題文がすでにあります。' });
  }
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO custom_words (genre, text, ruby) VALUES (?, ?, ?)',
      [genre, word.text, word.ruby]
    );
    await reloadCustomWords();
    res.status(201).json({ id: result.lastID, genre, text: word.text, ruby: word.ruby });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'このジャンルに同じ問題文がすでにあります。' });
    }
    console.error('Error adding custom word:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/admin-api/custom-words/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
  try {
    const db = await getDb();
    await db.run('DELETE FROM custom_words WHERE id = ?', [id]);
    await reloadCustomWords();
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting custom word:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 管理者用 API: CPU 対戦のカテゴリ表示 ---
let hiddenCpuCategories = [];

// DB の内容を読み直し、開いている画面にも配る
async function reloadCpuCategories() {
  hiddenCpuCategories = await getHiddenCpuCategories(await getDb());
  io.emit('cpuHiddenCategories', hiddenCpuCategories);
}

app.get('/admin-api/cpu-categories', (req, res) => {
  res.json({ hidden: hiddenCpuCategories });
});

app.patch('/admin-api/cpu-categories', async (req, res) => {
  const { category, visible } = req.body ?? {};
  if (!Object.values(CATEGORIES).includes(category) || typeof visible !== 'boolean') {
    return res.status(400).json({ error: 'カテゴリの指定が正しくありません。' });
  }
  try {
    await setCpuCategoryVisible(await getDb(), category, visible);
    await reloadCpuCategories();
    res.json({ hidden: hiddenCpuCategories });
  } catch (err) {
    console.error('Error updating CPU categories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 管理者用 API: にぎやかしの設定 ---
const CHEER_SETTINGS_KEY = 'cheer';

async function reloadCheerSettings() {
  const db = await getDb();
  const row = await db.get('SELECT value FROM app_settings WHERE key = ?', [CHEER_SETTINGS_KEY]);
  let saved = null;
  try { saved = row ? JSON.parse(row.value) : null; } catch { saved = null; }
  cheerSettings = loadCheerSettings(saved);
  io.emit('cheerSettings', publicCheerSettings(cheerSettings));
}

app.get('/admin-api/cheer-settings', (req, res) => {
  res.json(cheerSettings);
});

app.put('/admin-api/cheer-settings', async (req, res) => {
  const r = validateCheerSettings(req.body);
  if (!r.ok) return res.status(400).json({ error: r.error });
  try {
    const db = await getDb();
    await db.run(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [CHEER_SETTINGS_KEY, JSON.stringify(r.settings)]);
    await reloadCheerSettings();
    res.json(cheerSettings);
  } catch (err) {
    console.error('Error saving cheer settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 氏名の暗号化鍵を読み込む（無ければ氏名は保存しない）
initNameCrypto();

// 暗号化を入れる前に平文で保存された氏名があれば、鍵がある起動時に暗号化し直す
async function encryptLegacyPlainNames() {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT user_id, name FROM player_names');
    const plain = rows.filter(r => !isEncryptedName(r.name));
    if (plain.length === 0) return;
    if (!hasNameKey()) {
      console.warn(`[nameCrypto] 暗号化されていない氏名が ${plain.length} 件あります。NAME_ENCRYPTION_KEY を設定して再起動すると暗号化されます`);
      return;
    }
    // 上書きしただけでは古い平文が DB ファイルの空き領域や WAL に残るため、
    // secure_delete で消去しつつ書き換え、最後に WAL を空にして DB を作り直す
    await db.exec('PRAGMA secure_delete = ON');
    for (const r of plain) {
      await db.run('UPDATE player_names SET name = ? WHERE user_id = ?', [encryptName(r.user_id, r.name), r.user_id]);
    }
    await db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    await db.exec('VACUUM');
    await db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    console.log(`[nameCrypto] 平文で保存されていた氏名 ${plain.length} 件を暗号化しました`);
  } catch (err) {
    console.error('[nameCrypto] 既存の氏名の暗号化に失敗しました:', err.message);
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  encryptLegacyPlainNames();
  reloadCustomWords().catch(err => console.error('Error loading custom words:', err));
  reloadCpuCategories().catch(err => console.error('Error loading CPU categories:', err));
  reloadCheerSettings().catch(err => console.error('Error loading cheer settings:', err));

  // 予約したイベントを自動で開始する。
  // 予定時刻に待機室が 0 人ならスキップ（参加者のいない大会記録を作らない）。
  startScheduler({
    getDb,
    tryStart: async () => {
      if (tournamentState.status === 'active') return { result: 'skipped_active' };
      if (Object.keys(tournamentLobbyPlayers).length === 0) return { result: 'skipped_empty' };
      return { result: await startTournament() };
    },
    onRun: (info) => io.to('admin_room').emit('tournamentScheduleRun', info),
  });
});
