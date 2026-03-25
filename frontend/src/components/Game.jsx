import React, { useEffect, useState, useRef } from 'react';
import './Game.css';

export default function Game({ socket, roomState, myId }) {
  const [isReady, setIsReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(roomState.status === 'playing');
  const [damageFlash, setDamageFlash] = useState(false);
  const [isMiss, setIsMiss] = useState(false);
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

    const handleTypingResult = ({ success }) => {
      if (success) {
        setIsMiss(false);
      } else {
        setIsMiss(true);
      }
    };

    socket.on('gameStarted', handleGameStarted);
    socket.on('takingDamage', handleTakingDamage);
    socket.on('typingResult', handleTypingResult);

    return () => {
      socket.off('gameStarted', handleGameStarted);
      socket.off('takingDamage', handleTakingDamage);
      socket.off('typingResult', handleTypingResult);
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
    const stats = me.stats || { missCount: 0, keyMisses: {}, keyLatencies: {} };
    const topMisses = Object.entries(stats.keyMisses || {}).map(([k, c]) => ({ k, c })).sort((a,b) => b.c - a.c).slice(0,3);
    const topSlow = Object.entries(stats.keyLatencies || {}).map(([k, times]) => ({
        k, avg: Math.round(times.reduce((a,b) => a+b, 0) / Math.max(1, times.length))
    })).sort((a,b) => b.avg - a.avg).slice(0,3);

    return (
      <div className="game-container result-screen">
        <h2>Game Over!</h2>
        {me.isWinner ? (
          <h1 className="winner-text">YOU WON!</h1>
        ) : (
          <h1 className="loser-text">YOU LOST...</h1>
        )}
        <div className="players-list" style={{ marginBottom: '10px' }}>
          {Object.values(roomState.players).map(p => (
            <div key={p.id} className={`player-card ${p.isWinner ? 'winner' : ''}`}>
              <span>{p.name}</span>
              <span>{p.isWinner ? 'Winner' : 'Defeated'}</span>
            </div>
          ))}
        </div>

        {/* Tracking Stats display */}
        <div style={{
            display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '30px'
        }}>
            <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', minWidth: '150px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h4 style={{ margin: '0 0 10px', color: '#5c6bc0' }}>あなたのミスタイプ</h4>
                <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#e53935' }}>{stats.missCount || 0} <span style={{fontSize:'0.4em', color:'#888'}}>回</span></div>
                <div style={{ marginTop: '10px', fontSize: '0.9em', textAlign: 'left' }}>
                    <div style={{color:'#888', marginBottom:'4px'}}>ミスの多いキー:</div>
                    {topMisses.length > 0 ? topMisses.map((m, i) => (
                        <div key={i}>
                            <span style={{ display:'inline-block', width:'20px', fontWeight:'bold' }}>{m.k}</span>
                            <span style={{ color:'#e53935' }}>{m.c}回</span>
                        </div>
                    )) : <div style={{color:'#aaa'}}>なし🎉</div>}
                </div>
            </div>
            
            <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', minWidth: '150px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h4 style={{ margin: '0 0 10px', color: '#5c6bc0' }}>あなたの苦手キー (遅延)</h4>
                <div style={{ marginTop: '5px', fontSize: '0.9em', textAlign: 'left' }}>
                    {topSlow.length > 0 ? topSlow.map((s, i) => (
                        <div key={i} style={{ marginBottom: '6px' }}>
                            <span style={{ display:'inline-block', width:'20px', fontWeight:'bold' }}>{s.k}</span>
                            <span style={{ color:'#e8734a' }}>{s.avg}ms</span>
                        </div>
                    )) : <div style={{color:'#aaa'}}>データ不足</div>}
                </div>
            </div>
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
              <div className="hp-bar" style={{ width: `${Math.max(0, p.hp) / 10}%`, backgroundColor: p.hp > 500 ? '#4caf50' : p.hp > 200 ? '#ff9800' : '#f44336' }}></div>
            </div>
            <div className="progress-container" style={{ marginTop: '8px', background: '#e8e8e8', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div className="progress-bar" style={{
                width: p.typingState ? `${(p.typingState.typedRomaji.length / Math.max(1, p.typingState.typedRomaji.length + p.typingState.targetRomaji.length)) * 100}%` : '0%',
                backgroundColor: '#5c6bc0', height: '100%', transition: 'width 0.1s'
              }}></div>
            </div>
          </div>
        ))}
      </div>

      {me.hp > 0 ? (
        <div className="typing-area">
          <div className="target-word-japanese">
            <div className="ruby" style={{ fontSize: '0.9em', color: '#888', marginBottom: '5px' }}>{me.currentWord.ruby}</div>
            <div className="kanji" style={{ fontSize: '2em', fontWeight: 'bold', marginBottom: '15px', color: '#2c3e50' }}>{me.currentWord.text}</div>
          </div>
          <div className="target-word">
            {me.typingState && (
              <>
                <span className="char typed" style={{ color: '#4caf50' }}>{me.typingState.typedRomaji}</span>
                {me.typingState.targetRomaji.length > 0 && (
                  <span className={`char ${isMiss ? 'miss' : 'current'}`}>{me.typingState.targetRomaji[0]}</span>
                )}
                <span className="char">{me.typingState.targetRomaji.slice(1)}</span>
              </>
            )}
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
