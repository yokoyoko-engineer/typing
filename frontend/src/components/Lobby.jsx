import React, { useState } from 'react';
import './Room.css';

export default function Lobby({ socket, lobbies, onJoinRoom }) {
  const [playerName, setPlayerName] = useState('');

  const handleJoin = (roomId) => {
    if (socket && playerName) {
      onJoinRoom(roomId, playerName);
    } else if (!playerName) {
      alert("Please enter a player name first!");
    }
  };

  if (!socket) return <div className="room-container">Connecting to server...</div>;

  return (
    <div className="lobby-container">
      <h2>Select a Room</h2>
      <div className="player-name-input">
        <label>
          Your Name:
          <input 
            type="text" 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value)} 
            placeholder="Type your name"
            maxLength={12}
            required 
          />
        </label>
      </div>
      
      <div className="room-grid">
        {Array.isArray(lobbies) && lobbies.length > 0 ? lobbies.map(room => (
          <div key={room.roomId} className={`room-card ${room.playerCount >= 4 ? 'full' : ''} ${room.status !== 'waiting' ? 'playing' : ''}`}>
            <div className="room-card-header">
              <h3>Room {room.roomId}</h3>
              <span className="player-count">{room.playerCount}/4</span>
            </div>
            <div className="room-status">
              {room.status === 'playing' ? <span className="status playing">Playing</span> : <span className="status waiting">Waiting</span>}
            </div>
            <div className="room-players">
              {room.players.length > 0 ? (
                <ul>
                  {room.players.map((p, idx) => <li key={idx}>{p}</li>)}
                </ul>
              ) : (
                <p className="empty-text">Empty</p>
              )}
            </div>
            <button 
              className="join-btn small" 
              onClick={() => handleJoin(room.roomId)}
              disabled={room.playerCount >= 4 || room.status !== 'waiting'}
            >
              JOIN
            </button>
          </div>
        )) : <p className="empty-text">Loading rooms...</p>}
      </div>
    </div>
  );
}
