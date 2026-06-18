import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { CATEGORIES } from './words.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Security: Security Headers ---
app.use(helmet());

// --- Security: Rate Limiting ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 minutes
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
  res.json(rankings[key] || []);
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
      
      if (!rankings[key]) {
        rankings[key] = [];
      }
      
      rankings[key].push({ username: safeName, time, date: new Date().toISOString(), jobType: jobType || '', score: score || 0 });
      rankings[key].sort((a, b) => a.time - b.time);
      rankings[key] = rankings[key].slice(0, 30); // TOP 30を維持
      
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

app.get('/api/tournaments/:id/scores', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT user_id, job_type, score 
      FROM tournament_scores 
      WHERE tournament_id = ? 
      ORDER BY score DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching tournament scores:", err);
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

app.get('/api/tournaments/legends', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT user_id, MAX(job_type) as job_type, MAX(score) as score 
      FROM tournament_scores 
      GROUP BY user_id 
      ORDER BY score DESC 
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching legends:", err);
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
  // Allow only 1 to 4 digits (1 - 9999)
  if (/^[0-9]{1,4}$/.test(str)) {
    return str;
  }
  return null;
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
  participants: {} // userId -> maxScore
};

let tournamentTimer = null;
const tournamentLobbyPlayers = {}; // socketId -> playerName

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  let currentRoomId = null;

  // ロビーの最新状態を取得してクライアントに送信
  const sendLobbiesState = (targetSocket = io) => {
    const lobbies = Object.values(rooms).map(room => ({
      roomId: room.roomId,
      playerCount: Object.keys(room.players).length,
      players: Object.values(room.players).map(p => p.name),
      status: room.status
    }));
    targetSocket.emit('lobbiesState', lobbies);
  };

  // 接続時にロビー一覧を送信
  sendLobbiesState(socket);

  socket.on('joinTournament', ({ playerName, jobType }) => {
    const safeName = sanitizePlayerName(playerName);
    if (!safeName) {
      socket.emit('error', 'Invalid player name.');
      return;
    }
    socket.join('tournament_lobby');
    tournamentLobbyPlayers[socket.id] = { name: safeName, jobType: jobType || '' };
    io.to('admin_room').emit('tournamentLobbyUpdate', {
      count: Object.keys(tournamentLobbyPlayers).length,
      players: Object.values(tournamentLobbyPlayers).map(p => p.name).slice(0, 100)
    });
    
    socket.emit('tournamentState', { status: tournamentState.status, endTime: tournamentState.endTime });
  });

  socket.on('adminGetLobby', () => {
    socket.join('admin_room');
    socket.emit('tournamentLobbyUpdate', {
      count: Object.keys(tournamentLobbyPlayers).length,
      players: Object.values(tournamentLobbyPlayers).map(p => p.name).slice(0, 100)
    });
  });

  socket.on('adminStartTournament', async () => {
    if (tournamentState.status === 'active') return;
    
    tournamentState.status = 'active';
    tournamentState.endTime = Date.now() + 5 * 60 * 1000; // 5 minutes
    tournamentState.participants = {};
    
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
    
    if (tournamentTimer) clearTimeout(tournamentTimer);
    
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
        tournamentState.participants = {};
      }, 5000);
      
    }, 5 * 60 * 1000); // 5 minutes
  });

  socket.on('tournamentUpdateScore', ({ playerName, score, jobType }) => {
    const safeName = sanitizePlayerName(playerName);
    if (!safeName || tournamentState.status !== 'active') return;
    
    const currentMax = tournamentState.participants[safeName]?.score || 0;
    if (score > currentMax) {
      tournamentState.participants[safeName] = { score, jobType: jobType || '' };
      
      const sorted = Object.entries(tournamentState.participants)
        .map(([user_id, data]) => ({ user_id, score: data.score, jobType: data.jobType }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 300);
        
      io.to('tournament_lobby').emit('tournamentLiveRanking', sorted);
    }
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
    if (tournamentLobbyPlayers[socket.id]) {
      delete tournamentLobbyPlayers[socket.id];
      io.to('admin_room').emit('tournamentLobbyUpdate', {
        count: Object.keys(tournamentLobbyPlayers).length,
        players: Object.values(tournamentLobbyPlayers).map(p => p.name).slice(0, 100)
      });
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
