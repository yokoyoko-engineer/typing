import { getRandomWord } from './words.js';

export class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = {}; // socketId -> Player
    this.status = 'waiting'; // waiting, playing, finished
  }

  addPlayer(socketId, name) {
    if (Object.keys(this.players).length >= 4) {
      return false; // Room full
    }
    this.players[socketId] = {
      id: socketId,
      name: name || `Player ${Object.keys(this.players).length + 1}`,
      isReady: false,
      hp: 100,
      currentWord: '',
      typedChars: 0,
      isWinner: false
    };
    return true;
  }

  removePlayer(socketId) {
    delete this.players[socketId];
    if (Object.keys(this.players).length === 0) {
      return true; // Room empty
    }
    // Check if remaining players can continue
    if (this.status === 'playing' && Object.keys(this.players).length < 2) {
      this.status = 'finished';
      const lastPlayer = Object.values(this.players)[0];
      if (lastPlayer) lastPlayer.isWinner = true;
    }
    return false;
  }

  setPlayerReady(socketId, isReady) {
    if (this.players[socketId]) {
      this.players[socketId].isReady = isReady;
    }
  }

  canStart() {
    const playerArray = Object.values(this.players);
    if (playerArray.length < 2) return false;
    return playerArray.every(p => p.isReady);
  }

  startGame() {
    this.status = 'playing';
    Object.values(this.players).forEach(p => {
      p.hp = 100;
      p.currentWord = getRandomWord();
      p.typedChars = 0;
      p.isWinner = false;
    });
  }

  handleTyping(socketId, typedChar) {
    const player = this.players[socketId];
    if (!player || this.status !== 'playing' || player.hp <= 0) return null;

    const targetChar = player.currentWord.romaji[player.typedChars];
    
    // Correct typing
    if (typedChar === targetChar) {
      player.typedChars++;
      
      // Word completed
      if (player.typedChars === player.currentWord.romaji.length) {
        // Calculate based on length (1 char = 2 damage for example, to scale it better)
        const damage = player.currentWord.romaji.length * 2; 
        
        player.currentWord = getRandomWord();
        player.typedChars = 0;
        
        // Calculate damage to other players
        const otherPlayers = Object.values(this.players).filter(p => p.id !== socketId && p.hp > 0);
        
        if (otherPlayers.length > 0) {
          // 分散ダメージ
          const splitDamage = Math.floor(damage / otherPlayers.length);
          otherPlayers.forEach(p => {
            p.hp = Math.max(0, p.hp - splitDamage);
          });
        }
        
        this.checkWinCondition();
        return { success: true, wordCompleted: true, damageDealt: damage };
      }
      return { success: true, wordCompleted: false };
    }
    
    // Incorrect typing
    return { success: false, wordCompleted: false };
  }

  checkWinCondition() {
    const alivePlayers = Object.values(this.players).filter(p => p.hp > 0);
    if (alivePlayers.length === 1) {
      this.status = 'finished';
      alivePlayers[0].isWinner = true;
    } else if (alivePlayers.length === 0) {
      this.status = 'finished'; // Drop
    }
  }

  getState() {
    return {
      roomId: this.roomId,
      status: this.status,
      players: this.players
    };
  }
}
