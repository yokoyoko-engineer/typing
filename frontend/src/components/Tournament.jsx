import React, { useState, useEffect, useRef } from 'react';
import { getRandomWord, CATEGORIES } from '../words';
import { TypingSession } from '../utils/typingEngine';
import './Game.css';

// CPU Level 5 difficulty
const CPU_DIFFICULTY_MS = 285;
const TOURNAMENT_GENRE = CATEGORIES.BUSINESS;

export default function Tournament({ socket, onBackToHome }) {
    const [playerName, setPlayerName] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [gameState, setGameState] = useState('setup'); // setup, waiting, countdown, playing, intermission, spectating, finished
    const [countdown, setCountdown] = useState(3);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [liveRanking, setLiveRanking] = useState([]);
    const [lastResult, setLastResult] = useState(null);
    
    // Typing state
    const [playerInfo, setPlayerInfo] = useState({ hp: 1000, currentWord: null, typingState: null });
    const [cpuInfo, setCpuInfo] = useState({ hp: 1000, currentWord: null, typingState: null });
    const [damageFlash, setDamageFlash] = useState(false);
    const [isMiss, setIsMiss] = useState(false);

    const inputRef = useRef(null);
    const cpuIntervalRef = useRef(null);
    const cpuStateRef = useRef(cpuInfo);
    const playerStateRef = useRef(playerInfo);
    
    const pSessionRef = useRef(null);
    const cSessionRef = useRef(null);
    
    // For e-typing score calculation
    const currentBattleStartRef = useRef(null);
    const playerStatsRef = useRef({ missCount: 0, totalCorrect: 0 });
    
    const highestScoreRef = useRef(0);

    useEffect(() => { cpuStateRef.current = cpuInfo; }, [cpuInfo]);
    useEffect(() => { playerStateRef.current = playerInfo; }, [playerInfo]);

    // Socket Event Listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('tournamentState', (state) => {
            if (state.status === 'active' && gameState === 'waiting') {
                const remainingMs = state.endTime - Date.now();
                if (remainingMs > 0) {
                    setTimeRemaining(Math.ceil(remainingMs / 1000));
                    setGameState('playing');
                    startNewBattle();
                } else {
                    setGameState('finished');
                }
            } else if (state.status === 'finished') {
                setGameState('finished');
            }
        });

        socket.on('tournamentStarted', (data) => {
            if (gameState === 'waiting') {
                const remainingMs = data.endTime - Date.now();
                setTimeRemaining(Math.max(0, Math.ceil(remainingMs / 1000)));
                setGameState('countdown');
                setCountdown(3);
            }
        });

        socket.on('tournamentFinished', () => {
            setGameState('finished');
        });

        socket.on('tournamentLiveRanking', (ranking) => {
            setLiveRanking(ranking);
        });

        return () => {
            socket.off('tournamentState');
            socket.off('tournamentStarted');
            socket.off('tournamentFinished');
            socket.off('tournamentLiveRanking');
        };
    }, [socket, gameState]);

    const handleJoin = () => {
        const trimmed = nameInput.trim();
        if (/^[0-9]{1,4}$/.test(trimmed)) {
            setPlayerName(trimmed);
            socket.emit('joinTournament', { playerName: trimmed });
            setGameState('waiting');
        } else {
            alert('社員番号は1〜4桁の数字で入力してください');
        }
    };

    // Countdown Logic
    useEffect(() => {
        if (gameState === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setGameState('playing');
                startNewBattle();
            }
        }
    }, [gameState, countdown]);

    // Global Tournament Timer
    useEffect(() => {
        if (gameState === 'playing' || gameState === 'intermission' || gameState === 'spectating') {
            const timer = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState]);

    // Keep focus
    useEffect(() => {
        if (gameState === 'playing' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [gameState, playerInfo]);

    const startNewBattle = () => {
        const pWord = getRandomWord(TOURNAMENT_GENRE);
        const cWord = getRandomWord(TOURNAMENT_GENRE);
        
        pSessionRef.current = new TypingSession(pWord.ruby);
        cSessionRef.current = new TypingSession(cWord.ruby);
        
        playerStatsRef.current = { missCount: 0, totalCorrect: 0 };
        currentBattleStartRef.current = Date.now();

        setPlayerInfo({ hp: 1000, currentWord: pWord, typingState: pSessionRef.current.state });
        setCpuInfo({ hp: 1000, currentWord: cWord, typingState: cSessionRef.current.state });
    };

    // CPU Logic
    useEffect(() => {
        if (gameState === 'playing') {
            const msPerKey = CPU_DIFFICULTY_MS;

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

                        const newWord = getRandomWord(TOURNAMENT_GENRE);
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
                            // Player lost this round.
                            setLastResult({ status: 'lose', score: 0 });
                            setTimeout(() => {
                                setGameState(prev => (prev === 'playing' ? 'intermission' : prev));
                            }, 1000);
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
    }, [gameState]);

    // Player Typing Logic
    const handleKeyDown = (e) => {
        if (gameState !== 'playing' || playerInfo.hp <= 0) return;

        if (e.key.length === 1) {
            const typedChar = e.key.toLowerCase();
            const stats = playerStatsRef.current;
            const res = pSessionRef.current.input(typedChar);

            if (res && res.success) {
                stats.totalCorrect++;
                setIsMiss(false);
                if (res.finishedWord) {
                    const damage = Math.round((playerInfo.currentWord.ruby.length * 2) * 2.4);
                    const newCpuHp = Math.max(0, cpuInfo.hp - damage);

                    const newWord = getRandomWord(TOURNAMENT_GENRE);
                    pSessionRef.current = new TypingSession(newWord.ruby);

                    setCpuInfo(prev => ({ ...prev, hp: newCpuHp }));
                    setPlayerInfo(prev => ({
                        ...prev,
                        typingState: pSessionRef.current.state,
                        currentWord: newWord
                    }));

                    if (newCpuHp <= 0) {
                        // Player WON this round
                        const elapsed = ((Date.now() - currentBattleStartRef.current) / 1000);
                        const totalCorrect = stats.totalCorrect;
                        const totalMiss = stats.missCount;
                        const totalTyped = totalCorrect + totalMiss;
                        
                        let eScore = 0;
                        if (totalTyped > 0 && elapsed > 0) {
                            const wpm = totalCorrect / (elapsed / 60);
                            const accuracy = totalCorrect / totalTyped;
                            eScore = Math.round(wpm * Math.pow(accuracy, 3));
                        }
                        
                        if (eScore > highestScoreRef.current) {
                            highestScoreRef.current = eScore;
                            socket.emit('tournamentUpdateScore', { playerName, score: eScore });
                        }
                        
                        setLastResult({ status: 'win', score: eScore });
                        setTimeout(() => {
                            setGameState(prev => (prev === 'playing' ? 'intermission' : prev));
                        }, 1000);
                    }
                } else {
                    setPlayerInfo(prev => ({ ...prev, typingState: pSessionRef.current.state }));
                }
            } else {
                stats.missCount++;
                setIsMiss(true);
            }
        }
    };

    // Render Helpers
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (gameState === 'setup') {
        return (
            <div className="game-container">
                <h2>イベントモード（一斉バトル）</h2>
                <p style={{ color: '#888', marginBottom: '20px' }}>社員番号を入力してイベントに参加してください</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', maxWidth: '400px', margin: '0 auto' }}>
                    <input
                        type="number"
                        min="1"
                        max="9999"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value.slice(0, 4))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                        placeholder="社員番号 (1〜9999)"
                        style={{
                            width: '100%', padding: '15px 20px', fontSize: '1.3em',
                            border: '2px solid #ddd', borderRadius: '10px', textAlign: 'center', outline: 'none'
                        }}
                    />
                    <button
                        className="action-btn"
                        onClick={handleJoin}
                        disabled={!/^[0-9]{1,4}$/.test(nameInput.trim())}
                        style={{ width: '100%', height: '55px', fontSize: '1.2em' }}
                    >
                        待機室へ入る
                    </button>
                </div>
                <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '40px', background: '#e0e0e0', color: '#2c3e50' }}>
                    Back to Home
                </button>
            </div>
        );
    }

    if (gameState === 'waiting') {
        return (
            <div className="game-container">
                <h2>待機中...</h2>
                <p style={{ fontSize: '1.2em', color: '#5c6bc0' }}>管理者がイベントを開始するのをお待ちください</p>
                <div style={{ marginTop: '50px' }} className="spinner"></div>
                <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '40px', background: '#e0e0e0', color: '#2c3e50' }}>
                    退出する
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

    return (
        <div className={`game-container battle-screen ${damageFlash ? 'flash-damage' : ''}`} onKeyDown={gameState === 'playing' ? handleKeyDown : undefined} tabIndex="0" ref={inputRef}>
            
            <div style={{ display: 'flex', height: '100%' }}>
                
                {/* Main Battle Area */}
                <div style={{ flex: 1, paddingRight: '20px', borderRight: '2px dashed #ddd', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#2c3e50' }}>イベントモード: {TOURNAMENT_GENRE}</span>
                        <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#e53935' }}>
                            残り時間: {formatTime(timeRemaining)}
                        </span>
                    </div>

                    {gameState === 'playing' && (
                        <>
                            <div className="players-hud" style={{ marginBottom: '30px' }}>
                                {/* Player HUD */}
                                <div className={`hud-card me ${playerInfo.hp <= 0 ? 'dead' : ''}`}>
                                    <div className="hud-header">
                                        <span>{playerName}</span>
                                        <span>{playerInfo.hp} HP</span>
                                    </div>
                                    <div className="hp-bar-container">
                                        <div className="hp-bar" style={{ width: `${Math.max(0, playerInfo.hp) / 10}%`, backgroundColor: '#4caf50' }}></div>
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
                                        <span>CPU (Lv.5)</span>
                                        <span>{cpuInfo.hp} HP</span>
                                    </div>
                                    <div className="hp-bar-container">
                                        <div className="hp-bar" style={{ width: `${Math.max(0, cpuInfo.hp) / 10}%`, backgroundColor: '#f44336' }}></div>
                                    </div>
                                    <div className="progress-container" style={{ marginTop: '8px', background: '#e8e8e8', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div className="progress-bar" style={{
                                            width: cpuInfo.typingState ? `${(cpuInfo.typingState.typedRomaji.length / Math.max(1, cpuInfo.typingState.typedRomaji.length + cpuInfo.typingState.targetRomaji.length)) * 100}%` : '0%',
                                            backgroundColor: '#e8734a', height: '100%', transition: 'width 0.1s'
                                        }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="typing-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                {playerInfo.hp > 0 && cpuInfo.hp > 0 ? (
                                    <>
                                        <div className="target-word-japanese">
                                            <div className="ruby" style={{ fontSize: '0.9em', color: '#888', marginBottom: '5px' }}>{playerInfo.currentWord?.ruby}</div>
                                            <div className="kanji" style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '15px', color: '#2c3e50' }}>{playerInfo.currentWord?.text}</div>
                                        </div>
                                        <div className="target-word" style={{ fontSize: '2em' }}>
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
                                    </>
                                ) : (
                                    <h2 style={{ color: playerInfo.hp <= 0 ? '#e53935' : '#4caf50' }}>
                                        {playerInfo.hp <= 0 ? 'DEFEATED! Restarting...' : 'VICTORY! Restarting...'}
                                    </h2>
                                )}
                            </div>
                        </>
                    )}

                    {gameState === 'intermission' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <h2 style={{ fontSize: '4em', margin: 0, color: lastResult?.status === 'win' ? '#4caf50' : '#e53935' }}>
                                {lastResult?.status === 'win' ? 'VICTORY!' : 'DEFEATED...'}
                            </h2>
                            {lastResult?.status === 'win' && (
                                <div style={{ fontSize: '1.5em', margin: '20px 0' }}>
                                    今回のスコア: <span style={{ fontWeight: 'bold', color: '#5c6bc0', fontSize: '1.5em' }}>{lastResult.score}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
                                <button className="action-btn" onClick={() => {
                                    setGameState('playing');
                                    startNewBattle();
                                }}>
                                    もう一度挑戦する
                                </button>
                                <button className="action-btn" style={{ background: '#e0e0e0', color: '#333' }} onClick={() => {
                                    setGameState('spectating');
                                }}>
                                    待機してランキングを見る
                                </button>
                            </div>
                        </div>
                    )}

                    {gameState === 'spectating' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <h2 style={{ fontSize: '2.5em', color: '#5c6bc0' }}>観戦モード</h2>
                            <p style={{ fontSize: '1.2em', color: '#666' }}>他のプレイヤーの進行を見守っています...</p>
                            <button className="action-btn" style={{ marginTop: '40px' }} onClick={() => {
                                setGameState('playing');
                                startNewBattle();
                            }}>
                                もう一度挑戦する
                            </button>
                        </div>
                    )}

                    {gameState === 'finished' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <h2 style={{ fontSize: '3em', color: '#2c3e50' }}>イベント終了！</h2>
                            <p style={{ fontSize: '1.2em' }}>最終ランキングをご確認ください</p>
                            <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '20px' }}>Homeへ戻る</button>
                        </div>
                    )}
                </div>

                {/* Sidebar: Live Ranking */}
                <div style={{ width: '300px', paddingLeft: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ background: '#f5f5f5', borderRadius: '10px', padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#2c3e50' }}>
                            {gameState === 'finished' ? '👑 最終ランキング' : '🔥 リアルタイムランキング'}
                        </h3>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {liveRanking.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {liveRanking.map((entry, idx) => {
                                            const isMe = entry.user_id === playerName;
                                            return (
                                                <tr key={idx} style={{ 
                                                    background: isMe ? '#e8eaf6' : (idx % 2 === 0 ? '#fff' : 'transparent'),
                                                    borderBottom: '1px solid #ddd',
                                                    fontWeight: isMe ? 'bold' : 'normal'
                                                }}>
                                                    <td style={{ padding: '8px 5px', width: '40px', color: idx < 3 ? '#e8734a' : '#888' }}>
                                                        {idx + 1}.
                                                    </td>
                                                    <td style={{ padding: '8px 5px' }}>{entry.user_id}</td>
                                                    <td style={{ padding: '8px 5px', textAlign: 'right', color: '#5c6bc0' }}>
                                                        {entry.score}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#aaa', marginTop: '50px' }}>まだスコアがありません</p>
                            )}
                        </div>
                        <div style={{ marginTop: '15px', padding: '10px', background: '#e8eaf6', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9em', color: '#666' }}>あなたの最高スコア</div>
                            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2c3e50' }}>{highestScoreRef.current}</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
