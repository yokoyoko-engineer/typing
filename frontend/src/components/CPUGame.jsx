import React, { useState, useEffect, useRef } from 'react';
import { getRandomWord, CATEGORIES, CLOUD_GENRES, GENRES_BY_CATEGORY } from '../words';
import { TypingSession } from '../utils/typingEngine';
import './Game.css'; // Reuse existing Game styles

// CPU difficulty settings (ms per character) based on requested tiers
const CPU_DIFFICULTY = {
    1: 400,  // C
    2: 363,  // C+
    3: 333,  // B-
    4: 307,  // B
    5: 285,  // B+
    6: 266,  // A-
    7: 244,  // A
    8: 222,  // A+
    9: 200,  // S
    10: 158  // Fast
};

// --- Ranking helpers (localStorage) ---
function getRankingKey(genre, level) {
    return `typing_rank_${genre}_lv${level}`;
}

function getRankings(genre, level) {
    try {
        const data = localStorage.getItem(getRankingKey(genre, level));
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

function saveRanking(genre, level, username, timeSeconds) {
    const key = getRankingKey(genre, level);
    const rankings = getRankings(genre, level);
    rankings.push({ username, time: timeSeconds, date: new Date().toISOString() });
    rankings.sort((a, b) => a.time - b.time);
    const top10 = rankings.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(top10));
    return top10;
}

export default function CPUGame({ onBackToHome }) {
    const [playerName, setPlayerName] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [difficulty, setDifficulty] = useState(null);
    const [category, setCategory] = useState(null);
    const [genre, setGenre] = useState(null);
    const [gameState, setGameState] = useState('select'); // select, countdown, playing, finished
    const [selectionStep, setSelectionStep] = useState('username'); // username, category, genre, difficulty
    const [countdown, setCountdown] = useState(3);
    const [damageFlash, setDamageFlash] = useState(false);
    const [isMiss, setIsMiss] = useState(false);

    // Timer
    const [battleStartTime, setBattleStartTime] = useState(null);
    const [battleElapsed, setBattleElapsed] = useState(0);
    const [finalTime, setFinalTime] = useState(null);
    const [latestRankings, setLatestRankings] = useState([]);

    const [playerInfo, setPlayerInfo] = useState({
        hp: 1000,
        currentWord: null,
        typingState: null,
    });

    const [cpuInfo, setCpuInfo] = useState({
        hp: 1000,
        currentWord: null,
        typingState: null,
    });

    const [winner, setWinner] = useState(null);

    const inputRef = useRef(null);
    const cpuIntervalRef = useRef(null);
    const cpuStateRef = useRef(cpuInfo);
    const playerStateRef = useRef(playerInfo);
    const nameInputRef = useRef(null);

    const pSessionRef = useRef(null);
    const cSessionRef = useRef(null);

    useEffect(() => { cpuStateRef.current = cpuInfo; }, [cpuInfo]);
    useEffect(() => { playerStateRef.current = playerInfo; }, [playerInfo]);

    // Focus name input on mount
    useEffect(() => {
        if (selectionStep === 'username' && nameInputRef.current) {
            nameInputRef.current.focus();
        }
    }, [selectionStep]);

    const confirmName = () => {
        const trimmed = nameInput.trim();
        if (trimmed.length > 0 && trimmed.length <= 12) {
            setPlayerName(trimmed);
            setSelectionStep('category');
        }
    };

    const selectCategory = (cat) => {
        setCategory(cat);
        // If ことわざ or ビジネス用語, skip genre selection since it's a single genre
        if (cat === CATEGORIES.KOTOWAZA || cat === CATEGORIES.BUSINESS) {
            setGenre(cat);
            setSelectionStep('difficulty');
        } else {
            setSelectionStep('genre');
        }
    };

    const selectGenre = (g) => {
        setGenre(g);
        setSelectionStep('difficulty');
    };

    const startBattle = (lvl) => {
        setDifficulty(lvl);
        setGameState('countdown');
        setCountdown(3);
        setFinalTime(null);

        const pWord = getRandomWord(genre);
        const cWord = getRandomWord(genre);
        pSessionRef.current = new TypingSession(pWord.ruby);
        cSessionRef.current = new TypingSession(cWord.ruby);

        setPlayerInfo({ hp: 1000, currentWord: pWord, typingState: pSessionRef.current.state });
        setCpuInfo({ hp: 1000, currentWord: cWord, typingState: cSessionRef.current.state });
    };

    // Handle Countdown
    useEffect(() => {
        if (gameState === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setGameState('playing');
                setBattleStartTime(Date.now());
                if (inputRef.current) inputRef.current.focus();
            }
        }
    }, [gameState, countdown]);

    // Battle timer display
    useEffect(() => {
        if (gameState === 'playing' && battleStartTime) {
            const interval = setInterval(() => {
                setBattleElapsed(((Date.now() - battleStartTime) / 1000).toFixed(1));
            }, 100);
            return () => clearInterval(interval);
        }
    }, [gameState, battleStartTime]);

    // Focus maintainer
    useEffect(() => {
        if (gameState === 'playing' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [gameState]);

    // CPU Typing Logic
    useEffect(() => {
        if (gameState === 'playing' && difficulty) {
            const msPerKey = CPU_DIFFICULTY[difficulty];

            const typeNextChar = () => {
                if (gameState !== 'playing') return;

                let currentCpu = cpuStateRef.current;
                let pState = playerStateRef.current;

                if (currentCpu.hp <= 0 || pState.hp <= 0) return;

                const charToType = cSessionRef.current.state.targetRomaji[0];
                const res = cSessionRef.current.input(charToType);

                if (res && res.success) {
                    if (res.finishedWord) {
                        const damage = Math.round((currentCpu.currentWord.ruby.length * 2) * 2.4);
                        const newPlayerHp = Math.max(0, pState.hp - damage);

                        const newWord = getRandomWord(genre);
                        cSessionRef.current = new TypingSession(newWord.ruby);

                        setPlayerInfo(prev => ({ ...prev, hp: newPlayerHp }));
                        setCpuInfo(prev => ({
                            ...prev,
                            typingState: cSessionRef.current.state,
                            currentWord: newWord
                        }));

                        setDamageFlash(true);
                        setTimeout(() => setDamageFlash(false), 300);

                        if (newPlayerHp <= 0) {
                            setGameState('finished');
                            setWinner('CPU');
                            return;
                        }
                    } else {
                        setCpuInfo(prev => ({ ...prev, typingState: cSessionRef.current.state }));
                    }
                }

                const variance = msPerKey * 0.1;
                const randomDelay = msPerKey + (Math.random() * variance * 2 - variance);
                cpuIntervalRef.current = setTimeout(typeNextChar, randomDelay);
            };

            cpuIntervalRef.current = setTimeout(typeNextChar, msPerKey);

            return () => {
                if (cpuIntervalRef.current) clearTimeout(cpuIntervalRef.current);
            };
        }
    }, [gameState, difficulty, genre]);


    // Player Typing Logic
    const handleKeyDown = (e) => {
        if (gameState !== 'playing' || playerInfo.hp <= 0) return;

        if (e.key.length === 1) {
            const typedChar = e.key.toLowerCase();
            const res = pSessionRef.current.input(typedChar);

            if (res && res.success) {
                setIsMiss(false);
                if (res.finishedWord) {
                    const damage = Math.round((playerInfo.currentWord.ruby.length * 2) * 2.4);
                    const newCpuHp = Math.max(0, cpuInfo.hp - damage);

                    const newWord = getRandomWord(genre);
                    pSessionRef.current = new TypingSession(newWord.ruby);

                    setCpuInfo(prev => ({ ...prev, hp: newCpuHp }));
                    setPlayerInfo(prev => ({
                        ...prev,
                        typingState: pSessionRef.current.state,
                        currentWord: newWord
                    }));

                    if (newCpuHp <= 0) {
                        const elapsed = ((Date.now() - battleStartTime) / 1000);
                        const roundedTime = Math.round(elapsed * 100) / 100;
                        setFinalTime(roundedTime);
                        setGameState('finished');
                        setWinner('PLAYER');

                        // Save ranking
                        const updated = saveRanking(genre, difficulty, playerName, roundedTime);
                        setLatestRankings(updated);
                    }
                } else {
                    setPlayerInfo(prev => ({ ...prev, typingState: pSessionRef.current.state }));
                }
            } else {
                setIsMiss(true);
            }
        }
    };


    // --- Render Functions ---

    if (gameState === 'select') {
        // Username input
        if (selectionStep === 'username') {
            return (
                <div className="game-container">
                    <h2>プレイヤー名を入力</h2>
                    <p style={{ color: '#888', fontSize: '0.9em', marginBottom: '20px' }}>ランキングに表示される名前です（最大12文字）</p>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', maxWidth: '400px', margin: '0 auto' }}>
                        <input
                            ref={nameInputRef}
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value.slice(0, 12))}
                            onKeyDown={(e) => { if (e.key === 'Enter') confirmName(); }}
                            placeholder="名前を入力..."
                            style={{
                                width: '100%',
                                padding: '15px 20px',
                                fontSize: '1.3em',
                                border: '2px solid #ddd',
                                borderRadius: '10px',
                                textAlign: 'center',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#5c6bc0'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                        <button
                            className="action-btn"
                            onClick={confirmName}
                            disabled={nameInput.trim().length === 0}
                            style={{
                                width: '100%',
                                height: '55px',
                                fontSize: '1.2em',
                                opacity: nameInput.trim().length === 0 ? 0.5 : 1,
                            }}
                        >
                            決定
                        </button>
                    </div>
                    <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '40px', background: '#e0e0e0', color: '#2c3e50' }}>
                        Back to Home
                    </button>
                </div>
            );
        }

        // Category selection
        if (selectionStep === 'category') {
            return (
                <div className="game-container">
                    <p style={{ color: '#5c6bc0', fontWeight: 'bold', marginBottom: '5px' }}>プレイヤー: {playerName}</p>
                    <h2>カテゴリを選択</h2>
                    <div className="genre-grid" style={{
                        display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', maxWidth: '400px', margin: '20px auto'
                    }}>
                        {Object.values(CATEGORIES).map((cat) => (
                            <button
                                key={cat}
                                className="action-btn"
                                onClick={() => selectCategory(cat)}
                                style={{ height: '70px', fontSize: '1.3em' }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '40px', background: '#e0e0e0', color: '#2c3e50' }}>
                        Back to Home
                    </button>
                </div>
            );
        }

        // Genre selection (for クラウド category)
        if (selectionStep === 'genre') {
            const genreList = GENRES_BY_CATEGORY[category] || [];
            return (
                <div className="game-container">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <button onClick={() => setSelectionStep('category')} style={{ background: 'none', border: 'none', color: '#5c6bc0', cursor: 'pointer', fontSize: '1.1em' }}>‹ カテゴリに戻る</button>
                        <h2>ジャンルを選択 ({category})</h2>
                    </div>
                    <div className="genre-grid" style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '20px', maxWidth: '800px', margin: '20px auto', padding: '0 20px'
                    }}>
                        {genreList.map((g) => (
                            <button
                                key={g}
                                className="action-btn"
                                onClick={() => selectGenre(g)}
                                style={{ height: '60px', fontSize: '1em', padding: '8px' }}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                    <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '40px', background: '#e0e0e0', color: '#2c3e50' }}>
                        Back to Home
                    </button>
                </div>
            );
        }

        // Difficulty selection + Ranking preview
        const previewRankings = genre && difficulty === null ? [] : [];
        return (
            <div className="game-container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <button onClick={() => {
                        if (category === CATEGORIES.KOTOWAZA || category === CATEGORIES.BUSINESS) {
                            setSelectionStep('category');
                        } else {
                            setSelectionStep('genre');
                        }
                    }} style={{ background: 'none', border: 'none', color: '#5c6bc0', cursor: 'pointer', fontSize: '1.1em' }}>‹ 戻る</button>
                    <h2>難易度を選択 ({genre})</h2>
                </div>

                <div className="difficulty-grid" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '20px'
                }}>
                    {[...Array(10)].map((_, i) => {
                        const level = i + 1;
                        const levelRankings = getRankings(genre, level);
                        const bestTime = levelRankings.length > 0 ? levelRankings[0].time : null;
                        return (
                            <button
                                key={level}
                                className="action-btn"
                                onClick={() => startBattle(level)}
                                style={{ height: '80px', fontSize: '1em', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Lv.{level}</span>
                                {bestTime !== null && (
                                    <span style={{ fontSize: '0.7em', color: '#e8734a' }}>🏆 {bestTime}s</span>
                                )}
                            </button>
                        )
                    })}
                </div>

                <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '40px', background: '#e0e0e0', color: '#2c3e50' }}>
                    Back to Home
                </button>
            </div>
        );
    }

    if (gameState === 'countdown') {
        return (
            <div className="game-container battle-screen">
                <h1 style={{ fontSize: '8em', textAlign: 'center', marginTop: '20vh' }}>
                    {countdown}
                </h1>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <div className="game-container result-screen">
                <h2>Game Over!</h2>
                {winner === 'PLAYER' ? (
                    <h1 className="winner-text">YOU WON!</h1>
                ) : (
                    <h1 className="loser-text">YOU LOST...</h1>
                )}
                <div style={{ marginTop: '20px' }}>
                    <p>プレイヤー: {playerName}</p>
                    <p>ジャンル: {genre}</p>
                    <p>難易度: Level {difficulty}</p>
                    {finalTime !== null && (
                        <p style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#e8734a' }}>
                            ⏱ クリアタイム: {finalTime}秒
                        </p>
                    )}
                </div>

                {/* Ranking display */}
                {winner === 'PLAYER' && latestRankings.length > 0 && (
                    <div style={{
                        marginTop: '25px',
                        background: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '12px',
                        padding: '20px',
                        maxWidth: '500px',
                        margin: '25px auto 0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}>
                        <h3 style={{ margin: '0 0 15px', color: '#2c3e50', fontSize: '1.1em' }}>
                            🏆 ランキング TOP10 — {genre} Lv.{difficulty}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {latestRankings.map((entry, idx) => {
                                const isMe = entry.time === finalTime && entry.username === playerName;
                                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                                return (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        background: isMe ? '#ede7f6' : (idx % 2 === 0 ? '#f9f9f9' : '#fff'),
                                        border: isMe ? '2px solid #5c6bc0' : '1px solid transparent',
                                        fontWeight: isMe ? 'bold' : 'normal',
                                    }}>
                                        <span style={{ minWidth: '35px', textAlign: 'center' }}>{medal}</span>
                                        <span style={{ flex: 1, textAlign: 'left', paddingLeft: '10px', color: '#2c3e50' }}>{entry.username}</span>
                                        <span style={{ fontWeight: 'bold', color: '#e8734a', minWidth: '80px', textAlign: 'right' }}>{entry.time}秒</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px' }}>
                    <button className="action-btn" onClick={() => {
                        setGameState('select');
                        setSelectionStep('category');
                    }}>PLAY AGAIN</button>
                    <button className="action-btn" onClick={onBackToHome} style={{ background: '#e0e0e0', color: '#2c3e50' }}>BACK TO HOME</button>
                </div>
            </div>
        );
    }

    // Battle screen
    return (
        <div className={`game-container battle-screen ${damageFlash ? 'flash-damage' : ''}`} onKeyDown={handleKeyDown} tabIndex="0" ref={inputRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', alignItems: 'center' }}>
                <button className="action-btn" onClick={onBackToHome} style={{ padding: '5px 10px', background: '#e0e0e0', color: '#2c3e50', fontSize: '0.8em' }}>
                    Quit
                </button>
                <span style={{ fontSize: '1em', fontWeight: 'bold', color: '#2c3e50' }}>{genre} - Lv.{difficulty}</span>
                <span style={{ fontSize: '1em', fontWeight: 'bold', color: '#e8734a', fontFamily: 'monospace' }}>⏱ {battleElapsed}s</span>
            </div>

            <div className="players-hud">
                {/* Player HUD */}
                <div className={`hud-card me ${playerInfo.hp <= 0 ? 'dead' : ''}`}>
                    <div className="hud-header">
                        <span>{playerName}</span>
                        <span>{playerInfo.hp} HP</span>
                    </div>
                    <div className="hp-bar-container">
                        <div className="hp-bar" style={{ width: `${Math.max(0, playerInfo.hp) / 10}%`, backgroundColor: playerInfo.hp > 500 ? '#4caf50' : playerInfo.hp > 200 ? '#ff9800' : '#f44336' }}></div>
                    </div>
                    <div className="progress-container" style={{ marginTop: '8px', background: '#e8e8e8', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div className="progress-bar" style={{
                            width: playerInfo.typingState ? `${(playerInfo.typingState.typedRomaji.length / Math.max(1, playerInfo.typingState.typedRomaji.length + playerInfo.typingState.targetRomaji.length)) * 100}%` : '0%',
                            backgroundColor: '#5c6bc0', height: '100%', transition: 'width 0.1s'
                        }}></div>
                    </div>
                </div>

                {/* CPU HUD */}
                <div className={`hud-card ${cpuInfo.hp <= 0 ? 'dead' : ''}`}>
                    <div className="hud-header">
                        <span>CPU</span>
                        <span>{cpuInfo.hp} HP</span>
                    </div>
                    <div className="hp-bar-container">
                        <div className="hp-bar" style={{ width: `${Math.max(0, cpuInfo.hp) / 10}%`, backgroundColor: cpuInfo.hp > 500 ? '#4caf50' : cpuInfo.hp > 200 ? '#ff9800' : '#f44336' }}></div>
                    </div>
                    <div className="progress-container" style={{ marginTop: '8px', background: '#e8e8e8', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div className="progress-bar" style={{
                            width: cpuInfo.typingState ? `${(cpuInfo.typingState.typedRomaji.length / Math.max(1, cpuInfo.typingState.typedRomaji.length + cpuInfo.typingState.targetRomaji.length)) * 100}%` : '0%',
                            backgroundColor: '#e8734a', height: '100%', transition: 'width 0.1s'
                        }}></div>
                    </div>
                </div>
            </div>

            <div className="typing-area">
                {playerInfo.hp > 0 ? (
                    <>
                        <div className="target-word-japanese">
                            <div className="ruby" style={{ fontSize: '0.9em', color: '#888', marginBottom: '5px' }}>{playerInfo.currentWord?.ruby}</div>
                            <div className="kanji" style={{ fontSize: '2em', fontWeight: 'bold', marginBottom: '15px', color: '#2c3e50' }}>{playerInfo.currentWord?.text}</div>
                        </div>
                        <div className="target-word">
                            {playerInfo.typingState && (
                                <>
                                    <span className="char typed" style={{ color: '#4caf50' }}>{playerInfo.typingState.typedRomaji}</span>
                                    {playerInfo.typingState.targetRomaji.length > 0 && (
                                        <span className={`char ${isMiss ? 'miss' : 'current'}`}>{playerInfo.typingState.targetRomaji[0]}</span>
                                    )}
                                    <span className="char">{playerInfo.typingState.targetRomaji.slice(1)}</span>
                                </>
                            )}
                        </div>
                        <div className="instruction" style={{ marginTop: '20px' }}>Type the romaji to attack!</div>
                    </>
                ) : (
                    <div className="dead">
                        <h2>YOU ARE DEFEATED</h2>
                    </div>
                )}
            </div>
        </div>
    );
}
