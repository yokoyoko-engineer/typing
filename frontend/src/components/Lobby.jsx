import React, { useState } from 'react';
import './Room.css';

export default function Lobby({ socket, lobbies, onJoinRoom }) {
  const [playerName, setPlayerName] = useState('');
  const [jobType, setJobType] = useState('CL');

  const handleJoin = (roomId) => {
    if (socket && playerName) {
      onJoinRoom(roomId, playerName, jobType);
    } else if (!playerName) {
      alert("Please enter a player name first!");
    }
  };

  if (!socket) return <div className="room-container">Connecting to server...</div>;

  return (
    <div className="lobby-container">
      <h2>Select a Room</h2>
      <div className="player-name-input" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
        <label>
          Your Name:
          <input 
            type="number" 
            min="1"
            max="9999999"
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value.slice(0, 7))} 
            placeholder="1〜7桁の社員番号"
            required 
          />
        </label>
        <label>
          Job Type:
          <select value={jobType} onChange={(e) => setJobType(e.target.value)} style={{ marginLeft: '10px', padding: '5px' }}>
            <option value="CL">CL</option>
            <option value="JAVA">JAVA</option>
            <option value="ML">ML</option>
            <option value="FR">FR</option>
            <option value="QA">QA</option>
          </select>
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
