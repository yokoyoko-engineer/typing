import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"], 
    methods: ["GET", "POST"]
  }
});

// ヘルスチェック用
app.get('/', (req, res) => {
  res.send('Server is running');
});

const PORT = process.env.PORT || 3001;

import { GameRoom } from './gameLogic.js';

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
    console.log(`Received joinRoom event from ${socket.id} with roomId: ${roomId}, playerName: ${playerName}`);
    
    if (!rooms[roomId]) {
      socket.emit('error', 'Room does not exist.');
      return;
    }
    
    const room = rooms[roomId];
    if (room.addPlayer(socket.id, playerName)) {
      socket.join(roomId);
      currentRoomId = roomId;
      io.to(roomId).emit('roomState', room.getState());
      console.log(`${playerName}(${socket.id}) successfully joined room ${roomId}`);
      // 全員にロビー状態の変更を通知
      sendLobbiesState();
    } else {
      console.log(`${playerName}(${socket.id}) failed to join room ${roomId} (full)`);
      socket.emit('error', 'Room is full.');
    }
  });

  socket.on('setReady', (isReady) => {
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
    if (currentRoomId && rooms[currentRoomId]) {
      const room = rooms[currentRoomId];
      const result = room.handleTyping(socket.id, typedChar);
      
      if (result) {
        // 全員に現在の状態を同期
        io.to(currentRoomId).emit('roomState', room.getState());
        
        // 個人へのフィードバック
        socket.emit('typingResult', { 
            success: result.success, 
            wordCompleted: result.wordCompleted 
        });

        // 誰かがダメージを受けたエフェクト用イベント
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
    if (currentRoomId && rooms[currentRoomId]) {
      const room = rooms[currentRoomId];
      room.removePlayer(socket.id);
      io.to(currentRoomId).emit('roomState', room.getState());
      sendLobbiesState();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
