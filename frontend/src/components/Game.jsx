import React, { useEffect, useState, useRef } from 'react';
import { CATEGORIES, GENRES_BY_CATEGORY } from '../words';
import { alignTextAndRuby } from '../utils/typingEngine';
import './Game.css';

export default function Game({ socket, roomState, myId, onLeaveRoom }) {
  const [isReady, setIsReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(roomState.status === 'playing');
  const [countdown, setCountdown] = useState(roomState.status === 'starting' ? 3 : null);
  const [damageFlash, setDamageFlash] = useState(false);
  const [isMiss, setIsMiss] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleGameCountdown = (count) => {
      setCountdown(count);
      setGameStarted(false);
    };

    const handleGameStarted = () => {
      setCountdown(null);
      setGameStarted(true);
    };
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
    } else if (roomState.status === 'waiting') {
      // 待機状態に戻ったらリセット
      setGameStarted(false);
      setIsReady(false);
    } else if (roomState.status === 'starting') {
      setGameStarted(false);
    }

    const handleTypingResult = ({ success }) => {
      if (success) {
        setIsMiss(false);
      } else {
        setIsMiss(true);
      }
    };

    socket.on('gameCountdown', handleGameCountdown);
    socket.on('gameStarted', handleGameStarted);
    socket.on('takingDamage', handleTakingDamage);
    socket.on('typingResult', handleTypingResult);

    return () => {
      socket.off('gameCountdown', handleGameCountdown);
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
  if (roomState.status === 'waiting') {
    const currentGenre = roomState.genre || '';
    const currentCategory = Object.keys(GENRES_BY_CATEGORY).find(cat => GENRES_BY_CATEGORY[cat].includes(currentGenre)) || '';

    const handleCategoryChange = (e) => {
        const cat = e.target.value;
        if (cat === CATEGORIES.KOTOWAZA || cat === CATEGORIES.BUSINESS) {
            socket.emit('changeGenre', { genre: cat });
        } else {
            // Default to first genre in category
            const genres = GENRES_BY_CATEGORY[cat];
            if (genres && genres.length > 0) {
                socket.emit('changeGenre', { genre: genres[0] });
            }
        }
    };

    const handleGenreChange = (e) => {
        socket.emit('changeGenre', { genre: e.target.value });
    };

    return (
      <div className="game-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Room: {roomState.roomId}</h2>
          <button className="action-btn" onClick={onLeaveRoom} style={{ padding: '5px 10px', fontSize: '0.8em', background: '#e53935', color: '#fff' }}>🚪 LEAVE ROOM</button>
        </div>

        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>ゲーム設定 (ジャンル)</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <select value={currentCategory} onChange={handleCategoryChange} style={{ padding: '8px', borderRadius: '5px' }}>
                    <option value="" disabled>カテゴリを選択</option>
                    {Object.values(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                
                {currentCategory && currentCategory !== CATEGORIES.KOTOWAZA && currentCategory !== CATEGORIES.BUSINESS && (
                    <select value={currentGenre} onChange={handleGenreChange} style={{ padding: '8px', borderRadius: '5px' }}>
                        {GENRES_BY_CATEGORY[currentCategory].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                )}
            </div>
            {!currentGenre && <p style={{ color: '#e8734a', fontSize: '0.85em', margin: '5px 0 0' }}>ジャンルが未選択の場合はランダムになります</p>}
        </div>

        <div className="players-list">
          {Object.values(roomState.players).map(p => (
            <div key={p.id} className={`player-card ${p.isReady ? 'ready' : ''} ${p.id === myId ? 'me' : ''}`}>
              <span className="player-name">{p.jobType ? `[${p.jobType}] ` : ''}{p.name} {p.id === myId ? '(You)' : ''}</span>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px', marginTop: '15px' }}>
            {/* Left Column: Player lists & Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '220px' }}>
                <div className="players-list" style={{ margin: 0 }}>
                  {Object.values(roomState.players).map(p => (
                    <div key={p.id} className={`player-card ${p.isWinner ? 'winner' : ''}`} style={{ padding: '10px' }}>
                      <span style={{ fontSize: '0.9em' }}>{p.jobType ? `[${p.jobType}] ` : ''}{p.name}</span>
                      <span style={{ fontSize: '0.8em' }}>{p.isWinner ? 'Winner' : 'Defeated'}</span>
                    </div>
                  ))}
                </div>
                <button className="action-btn" onClick={resetGame} style={{ marginTop: 'auto' }}>PLAY AGAIN</button>
                <button className="action-btn" onClick={onLeaveRoom} style={{ marginTop: '10px', background: '#e53935', color: '#fff' }}>LEAVE ROOM</button>
            </div>

            {/* Right Column: Tracking Stats display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', minWidth: '160px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <h4 style={{ margin: '0 0 10px', color: '#5c6bc0' }}>ミスタイプ</h4>
                    <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#e53935' }}>{stats.missCount || 0} <span style={{fontSize:'0.4em', color:'#888'}}>回</span></div>
                    <div style={{ marginTop: '5px', fontSize: '0.85em', textAlign: 'left' }}>
                        <div style={{color:'#888', marginBottom:'2px'}}>ワースト3:</div>
                        {topMisses.length > 0 ? topMisses.map((m, i) => (
                            <div key={i}>
                                <span style={{ display:'inline-block', width:'20px', fontWeight:'bold' }}>{m.k}</span>
                                <span style={{ color:'#e53935' }}>{m.c}回</span>
                            </div>
                        )) : <div style={{color:'#aaa'}}>なし🎉</div>}
                    </div>
                </div>
                
                <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', minWidth: '160px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <h4 style={{ margin: '0 0 10px', color: '#5c6bc0' }}>苦手キー (遅延)</h4>
                    <div style={{ marginTop: '0', fontSize: '0.85em', textAlign: 'left' }}>
                        <div style={{color:'#888', marginBottom:'2px'}}>ワースト3:</div>
                        {topSlow.length > 0 ? topSlow.map((s, i) => (
                            <div key={i} style={{ marginBottom: '4px' }}>
                                <span style={{ display:'inline-block', width:'20px', fontWeight:'bold' }}>{s.k}</span>
                                <span style={{ color:'#e8734a' }}>{s.avg}ms</span>
                            </div>
                        )) : <div style={{color:'#aaa'}}>データ不足</div>}
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Render Countdown Screen
  if (roomState.status === 'starting' || countdown !== null) {
    return (
      <div className="game-container battle-screen">
        <h1 style={{ fontSize: '8em', textAlign: 'center', marginTop: '20vh' }}>
          {countdown !== null ? countdown : 3}
        </h1>
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
              <span>{p.jobType ? `[${p.jobType}] ` : ''}{p.name}</span>
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
            <div className="ruby" style={{ fontSize: '0.9em', color: '#888', marginBottom: '5px' }}>
              {me.typingState ? (
                <>
                  <span style={{ color: '#4caf50' }}>{me.typingState.typedRuby}</span>
                  <span>{me.typingState.targetRuby}</span>
                </>
              ) : me.currentWord.ruby}
            </div>
            <div className="kanji" style={{ fontSize: '2em', fontWeight: 'bold', marginBottom: '15px' }}>
              {(() => {
                if (!me.currentWord.text) return null;
                if (!me.typingState || !me.typingState.typedRuby) return <span style={{ color: '#2c3e50' }}>{me.currentWord.text}</span>;
                
                const chunks = alignTextAndRuby(me.currentWord.text, me.currentWord.ruby);
                let remainingTypedRuby = me.typingState.typedRuby.length;

                return chunks.map((chunk, index) => {
                  let chunkRubyLen = chunk.ruby.length;
                  let chunkTypedRubyLen = Math.min(remainingTypedRuby, chunkRubyLen);
                  remainingTypedRuby -= chunkTypedRubyLen;

                  let coloredTextChars = 0;
                  if (chunkRubyLen > 0) {
                      let ratio = chunkTypedRubyLen / chunkRubyLen;
                      coloredTextChars = Math.round(ratio * chunk.text.length);
                  } else {
                      coloredTextChars = remainingTypedRuby > 0 ? chunk.text.length : 0;
                  }
                  
                  let greenText = chunk.text.substring(0, coloredTextChars);
                  let blueText = chunk.text.substring(coloredTextChars);
                  
                  return (
                      <React.Fragment key={index}>
                          {greenText && <span style={{ color: '#4caf50' }}>{greenText}</span>}
                          {blueText && <span style={{ color: '#2c3e50' }}>{blueText}</span>}
                      </React.Fragment>
                  );
                });
              })()}
            </div>
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
