import { getRandomWord } from './words.js';
import { TypingSession } from './utils/typingEngine.js';

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
      hp: 1000,
      currentWord: null,
      typingSession: null,
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
      p.hp = 1000;
      const word = getRandomWord();
      p.currentWord = word;
      p.typingSession = new TypingSession(word.ruby);
      p.isWinner = false;
    });
  }

  handleTyping(socketId, typedChar) {
    const player = this.players[socketId];
    if (!player || this.status !== 'playing' || player.hp <= 0) return null;

    const result = player.typingSession.input(typedChar);

    if (result && result.success) {
      if (result.finishedWord) {
        // Calculate based on ruby length (roughly equivalent to 2+ romaji chars each)
        // or we could use the fully typed length, but ruby length is safe enough. Let's say ruby = 2 romaji chars
        const damage = Math.round((player.currentWord.ruby.length * 2) * 2.4);

        const newWord = getRandomWord();
        player.currentWord = newWord;
        player.typingSession = new TypingSession(newWord.ruby);

        // Calculate damage to other players
        const otherPlayers = Object.values(this.players).filter(p => p.id !== socketId && p.hp > 0);

        if (otherPlayers.length > 0) {
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
    const serializedPlayers = {};
    for (const [id, p] of Object.entries(this.players)) {
      serializedPlayers[id] = {
        id: p.id,
        name: p.name,
        isReady: p.isReady,
        hp: p.hp,
        currentWord: p.currentWord,
        typingState: p.typingSession ? p.typingSession.state : null,
        isWinner: p.isWinner
      };
    }

    return {
      roomId: this.roomId,
      status: this.status,
      players: serializedPlayers
    };
  }
}
