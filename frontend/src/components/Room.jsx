import React, { useState } from 'react';
import './Room.css';

export default function Room({ socket, currentRoom, onJoinRoom }) {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (socket && roomId && playerName) {
      onJoinRoom(roomId, playerName);
    }
  };

  if (!socket) return <div className="room-container">Connecting to server...</div>;

  return (
    <div className="room-container">
      <h2>Join a Typist Room</h2>
      <form onSubmit={handleJoin} className="room-form">
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
        <label>
          Room ID:
          <input 
            type="text" 
            value={roomId} 
            onChange={(e) => setRoomId(e.target.value)} 
            placeholder="e.g. 1234"
            required 
            autoComplete="off"
          />
        </label>
        <button type="submit" className="join-btn">JOIN ROOM</button>
      </form>
    </div>
  );
}
