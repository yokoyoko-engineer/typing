import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();

// --- Security: CORS制限 ---
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"]
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
  if (typeof name !== 'string') return null;
  // HTMLタグを除去
  const stripped = name.replace(/<[^>]*>/g, '').trim();
  if (stripped.length === 0 || stripped.length > 12) return null;
  // 英数字、ひらがな、カタカナ、漢字、スペース、一般記号のみ許可
  if (!/^[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u0020\-_.!]+$/u.test(stripped)) return null;
  return stripped;
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
  rooms[roomId] = new GameRoom(roomId);
}

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

  socket.on('joinRoom', ({ roomId, playerName }) => {
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
    if (room.addPlayer(socket.id, safeName)) {
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

  socket.on('startGame', () => {
    if (currentRoomId && rooms[currentRoomId]) {
      const room = rooms[currentRoomId];
      if (room.canStart()) {
        room.startGame();
        io.to(currentRoomId).emit('roomState', room.getState());
        io.to(currentRoomId).emit('gameStarted');
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
    console.log(`User disconnected: ${socket.id}`);
    // レート制限マップからクリーンアップ
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
