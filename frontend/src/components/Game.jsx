import React, { useEffect, useState, useRef } from 'react';
import './Game.css';

export default function Game({ socket, roomState, myId }) {
  const [isReady, setIsReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(roomState.status === 'playing');
  const [damageFlash, setDamageFlash] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleGameStarted = () => setGameStarted(true);
    const handleTakingDamage = ({ from, damage }) => {
      // 自分が受けたダメージの場合エフェクトを再生
      // 実際には HP の減衰などで判断するが、今回は全員に分散ダメージのため全体的に被弾エフェクトを入れる
      if (from !== myId) {
        setDamageFlash(true);
        setTimeout(() => setDamageFlash(false), 300);
      }
    };
    
    // 状態が playing になったら auto focus
    if (roomState.status === 'playing') {
      setGameStarted(true);
      if (inputRef.current) inputRef.current.focus();
    }

    socket.on('gameStarted', handleGameStarted);
    socket.on('takingDamage', handleTakingDamage);

    return () => {
      socket.off('gameStarted', handleGameStarted);
      socket.off('takingDamage', handleTakingDamage);
    };
  }, [socket, myId, roomState.status]);

  // フォーカス維持
  useEffect(() => {
    if (gameStarted && roomState.status === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameStarted, roomState.status]);

  const handleReady = () => {
    socket.emit('setReady', !isReady);
    setIsReady(!isReady);
  };

  const handleKeyDown = (e) => {
    if (!gameStarted || roomState.status !== 'playing') return;
    const me = roomState.players[myId];
    if (me && me.hp <= 0) return; // 死亡時は入力不可

    // key length === 1 means a printable character
    if (e.key.length === 1) {
      socket.emit('typing', e.key.toLowerCase());
    }
  };

  const resetGame = () => {
    socket.emit('resetGame');
  };

  const me = roomState.players[myId];
  if (!me) return null;

  // Render waiting room
  if (!gameStarted || roomState.status === 'waiting') {
    return (
      <div className="game-container">
        <h2>Room: {roomState.roomId}</h2>
        <div className="players-list">
          {Object.values(roomState.players).map(p => (
            <div key={p.id} className={`player-card ${p.isReady ? 'ready' : ''} ${p.id === myId ? 'me' : ''}`}>
              <span className="player-name">{p.name} {p.id === myId ? '(You)' : ''}</span>
              <span className="player-status">{p.isReady ? 'READY' : 'WAITING'}</span>
            </div>
          ))}
        </div>
        <div className="game-actions">
          <button 
            className={`action-btn ${isReady ? 'ready-btn' : ''}`} 
            onClick={handleReady}
          >
            {isReady ? 'CANCEL READY' : 'READY TO FIGHT'}
          </button>
        </div>
        {!gameStarted && Object.values(roomState.players).every(p => p.isReady) && Object.keys(roomState.players).length >= 2 && (
          <div className="start-btn-container">
            <button className="start-btn action-btn ready-btn" onClick={() => socket.emit('startGame')}>
              START BATTLE
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render Result Screen
  if (roomState.status === 'finished') {
    return (
      <div className="game-container result-screen">
        <h2>Game Over!</h2>
        {me.isWinner ? (
          <h1 className="winner-text">YOU WON!</h1>
        ) : (
          <h1 className="loser-text">YOU LOST...</h1>
        )}
        <div className="players-list">
           {Object.values(roomState.players).map(p => (
              <div key={p.id} className={`player-card ${p.isWinner ? 'winner' : ''}`}>
                  <span>{p.name}</span>
                  <span>{p.isWinner ? 'Winner' : 'Defeated'}</span>
              </div>
           ))}
        </div>
        <button className="action-btn" onClick={resetGame}>PLAY AGAIN</button>
      </div>
    );
  }

  // Render Battle Screen
  return (
    <div className={`game-container battle-screen ${damageFlash ? 'flash-damage' : ''}`} onKeyDown={handleKeyDown} tabIndex="0" ref={inputRef}>
      <div className="players-hud">
        {Object.values(roomState.players).map(p => (
          <div key={p.id} className={`hud-card ${p.id === myId ? 'me' : ''} ${p.hp <= 0 ? 'dead' : ''}`}>
            <div className="hud-header">
              <span>{p.name}</span>
              <span>{p.hp} HP</span>
            </div>
            <div className="hp-bar-container">
              <div className="hp-bar" style={{ width: `${Math.max(0, p.hp)}%`, backgroundColor: p.hp > 50 ? '#4caf50' : p.hp > 20 ? '#ff9800' : '#f44336' }}></div>
            </div>
            <div className="progress-container" style={{ marginTop: '8px', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div className="progress-bar" style={{ width: `${(p.typedChars / (p.currentWord?.romaji?.length || 1)) * 100}%`, backgroundColor: '#00d2ff', height: '100%', transition: 'width 0.1s' }}></div>
            </div>
          </div>
        ))}
      </div>

      {me.hp > 0 ? (
        <div className="typing-area">
          <div className="target-word-japanese">
            <div className="ruby" style={{ fontSize: '0.9em', color: '#ccc', marginBottom: '5px' }}>{me.currentWord.ruby}</div>
            <div className="kanji" style={{ fontSize: '2em', fontWeight: 'bold', marginBottom: '15px' }}>{me.currentWord.text}</div>
          </div>
          <div className="target-word">
            {me.currentWord.romaji.split('').map((char, i) => {
              let className = 'char';
              if (i < me.typedChars) className += ' typed';
              else if (i === me.typedChars) className += ' current';
              return <span key={i} className={className}>{char}</span>;
            })}
          </div>
          <div className="instruction" style={{ marginTop: '20px' }}>Type the romaji to attack!</div>
        </div>
      ) : (
        <div className="typing-area dead">
          <h2>YOU ARE DEFEATED</h2>
          <p>Waiting for the match to end...</p>
        </div>
      )}
    </div>
  );
}
