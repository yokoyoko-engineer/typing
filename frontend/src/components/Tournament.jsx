import React, { useState, useEffect, useRef } from 'react';
import { getRandomWord, CATEGORIES } from '../words';
import { TypingSession, alignTextAndRuby } from '../utils/typingEngine';
import './Game.css';

const CPU_DIFFICULTY_MAP = {
    1: 400,
    2: 363,
    3: 333,
    4: 307,
    5: 285,
    6: 266,
    7: 244,
    8: 222,
    9: 200,
    10: 158
};
const TOURNAMENT_GENRE = CATEGORIES.BUSINESS;

// 1. Live Ranking Component (Optimized to update independently and scrollable)
function TournamentRanking({ socket, playerName, jobType, globalLegends, highestScore }) {
    const [liveRanking, setLiveRanking] = useState([]);

    useEffect(() => {
        if (!socket) return;

        socket.on('tournamentLiveRanking', (ranking) => {
            setLiveRanking(ranking);
        });

        return () => {
            socket.off('tournamentLiveRanking');
        };
    }, [socket]);

    return (
        <div style={{ width: '300px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ background: '#f5f5f5', borderRadius: '10px', padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#2c3e50' }}>
                    🔥 リアルタイムランキング
                </h3>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                    {liveRanking.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 5px' }}>
                            <tbody>
                                {liveRanking.map((entry, idx) => {
                                    const isMe = entry.user_id === playerName;
                                    const legendThreshold = globalLegends.length >= 5 ? globalLegends[4].score : 0;
                                    const isLegendBeat = entry.score > legendThreshold && entry.score > 0;
                                    
                                    return (
                                        <tr key={idx} style={{ 
                                            background: isLegendBeat ? 'linear-gradient(90deg, #FFD700 0%, #FDB931 100%)' : (isMe ? '#e8eaf6' : '#fff'),
                                            fontWeight: isMe || isLegendBeat ? 'bold' : 'normal',
                                            boxShadow: isLegendBeat ? '0 0 10px rgba(255,215,0,0.8)' : '0 1px 3px rgba(0,0,0,0.1)',
                                            transform: isLegendBeat ? 'scale(1.02)' : 'none',
                                            transition: 'all 0.3s',
                                            borderRadius: '5px'
                                        }}>
                                            <td style={{ padding: '8px 5px', width: '40px', color: isLegendBeat ? '#000' : (idx < 3 ? '#e8734a' : '#888'), borderRadius: '5px 0 0 5px' }}>
                                                {idx + 1}.
                                            </td>
                                            <td style={{ padding: '8px 5px', color: isLegendBeat ? '#000' : 'inherit' }}>
                                                {isLegendBeat && <span style={{marginRight: '5px'}}>👑</span>}
                                                {entry.jobType ? `[${entry.jobType}] ` : ''}{entry.user_id}
                                            </td>
                                            <td style={{ padding: '8px 5px', textAlign: 'right', color: isLegendBeat ? '#000' : '#5c6bc0', borderRadius: '0 5px 5px 0' }}>
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
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2c3e50' }}>{highestScore}</div>
                </div>
            </div>
        </div>
    );
}

// 2. Battle (Typing) Component (Locked UI positions)
function TournamentBattle({
    socket,
    playerName,
    jobType,
    cpuLevel,
    gameState,
    setGameState,
    timeRemaining,
    lastResult,
    setLastResult,
    highestScore,
    setHighestScore,
    onBackToHome
}) {
    const [playerInfo, setPlayerInfo] = useState({ hp: 1000, currentWord: null, typingState: null });
    const [cpuInfo, setCpuInfo] = useState({ hp: 1000, currentWord: null, typingState: null });
    const [damageFlash, setDamageFlash] = useState(false);
    const [isMiss, setIsMiss] = useState(false);
    const [countdown, setCountdown] = useState(3);

    const usedWordsRef = useRef(new Set());
    const inputRef = useRef(null);
    const cpuIntervalRef = useRef(null);
    const cpuStateRef = useRef(cpuInfo);
    const playerStateRef = useRef(playerInfo);
    
    const pSessionRef = useRef(null);
    const cSessionRef = useRef(null);
    
    const currentBattleStartRef = useRef(null);
    const playerStatsRef = useRef({ missCount: 0, totalCorrect: 0 });

    useEffect(() => { cpuStateRef.current = cpuInfo; }, [cpuInfo]);
    useEffect(() => { playerStateRef.current = playerInfo; }, [playerInfo]);

    // Keep focus
    useEffect(() => {
        if ((gameState === 'playing' || gameState === 'ready') && inputRef.current) {
            inputRef.current.focus();
        }
    }, [gameState, playerInfo]);

    const startNewBattle = () => {
        const pWord = getRandomWord(TOURNAMENT_GENRE, usedWordsRef.current);
        const cWord = getRandomWord(TOURNAMENT_GENRE, usedWordsRef.current);
        
        pSessionRef.current = new TypingSession(pWord.ruby, pWord.text);
        cSessionRef.current = new TypingSession(cWord.ruby, cWord.text);
        
        playerStatsRef.current = { missCount: 0, totalCorrect: 0 };
        currentBattleStartRef.current = Date.now();

        setPlayerInfo({ hp: 1000, currentWord: pWord, typingState: pSessionRef.current.state });
        setCpuInfo({ hp: 1000, currentWord: cWord, typingState: cSessionRef.current.state });
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

    // CPU Logic
    useEffect(() => {
        if (gameState === 'playing') {
            const msPerKey = CPU_DIFFICULTY_MAP[cpuLevel] || 285;

            const typeNextChar = () => {
                if (gameState !== 'playing') return;

                let currentCpu = cpuStateRef.current;
                let pState = playerStateRef.current;

                if (currentCpu.hp <= 0 || pState.hp <= 0) return;
                if (!cSessionRef.current || !cSessionRef.current.state.targetRomaji) return;

                const charToType = cSessionRef.current.state.targetRomaji[0];
                const res = cSessionRef.current.input(charToType);

                if (res && res.success) {
                    if (res.finishedWord) {
                        const newWord = getRandomWord(TOURNAMENT_GENRE, usedWordsRef.current);
                        const damage = Math.round((currentCpu.currentWord.ruby.length * 2) * 2.4);
                        const newPlayerHp = Math.max(0, pState.hp - damage);

                        cSessionRef.current = new TypingSession(newWord.ruby, newWord.text);

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
    }, [gameState, cpuLevel]);

    // Player Typing Logic
    const handleKeyDown = (e) => {
        if (gameState === 'ready') {
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                setCountdown(3);
                setGameState('countdown');
            }
            return;
        }

        if (gameState !== 'playing' || playerInfo.hp <= 0) return;

        if (e.key.length === 1) {
            const typedChar = e.key.toLowerCase();
            const stats = playerStatsRef.current;
            const res = pSessionRef.current.input(typedChar);

            if (res && res.success) {
                stats.totalCorrect++;
                setIsMiss(false);
                if (res.finishedWord) {
                    const newWord = getRandomWord(TOURNAMENT_GENRE, usedWordsRef.current);
                    const damage = Math.round((playerInfo.currentWord.ruby.length * 2) * 2.4);
                    const newCpuHp = Math.max(0, cpuInfo.hp - damage);

                    pSessionRef.current = new TypingSession(newWord.ruby, newWord.text);

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
                        
                        if (eScore > highestScore) {
                            setHighestScore(eScore);
                            socket.emit('tournamentUpdateScore', { playerName, score: eScore, jobType });
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

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (gameState === 'ready') {
        return (
            <div 
                className="game-container battle-screen ready-screen" 
                onKeyDown={handleKeyDown} 
                tabIndex="0" 
                ref={inputRef} 
                style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%', 
                    flex: 1, 
                    outline: 'none',
                    background: '#fcfcfc',
                    boxShadow: 'none',
                    border: 'none',
                    margin: 0,
                    padding: 0,
                    boxSizing: 'border-box'
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div 
                        style={{ 
                            fontSize: '3.5em', 
                            fontWeight: 'bold', 
                            color: '#5c6bc0', 
                            marginBottom: '20px', 
                            animation: 'pulse 1.5s infinite',
                            textShadow: '0 2px 4px rgba(92,107,192,0.1)'
                        }}
                    >
                        スペースキーで開始
                    </div>
                    <div style={{ fontSize: '1.2em', color: '#888' }}>
                        スペースキーを押すとカウントダウンが始まります
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'countdown') {
        return (
            <div className="game-container battle-screen" style={{ flex: 1, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fafafa', border: 'none', boxShadow: 'none', margin: 0, padding: 0, boxSizing: 'border-box' }}>
                <h1 style={{ fontSize: '8em', textAlign: 'center', margin: 0, color: '#2c3e50', fontWeight: 'bold' }}>
                    {countdown}
                </h1>
            </div>
        );
    }

    return (
        <div className={`game-container battle-screen ${damageFlash ? 'flash-damage' : ''}`} onKeyDown={gameState === 'playing' ? handleKeyDown : undefined} tabIndex="0" ref={inputRef} style={{ flex: 1, height: '100%', outline: 'none', border: 'none', boxShadow: 'none', padding: 0, margin: 0, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#2c3e50' }}>イベントモード: {TOURNAMENT_GENRE}</span>
                    <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#e53935' }}>
                        残り時間: {formatTime(timeRemaining)}
                    </span>
                </div>

                {gameState === 'playing' && (
                    <>


                        {/* Typing Area with Fixed Height and Flex Center */}
                        <div className="typing-area" style={{ width: '100%', height: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 1.5rem', boxSizing: 'border-box', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e8e8e8' }}>
                            {playerInfo.hp > 0 && cpuInfo.hp > 0 ? (
                                <>
                                    <div className="target-word-japanese" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        {/* Ruby height locked */}
                                        <div className="ruby" style={{ fontSize: '0.9em', color: '#888', marginBottom: '5px', height: '24px', lineHeight: '24px', textAlign: 'center', overflow: 'hidden', width: '100%' }}>
                                            {playerInfo.typingState ? (
                                                <>
                                                    <span style={{ color: '#ff9800' }}>{playerInfo.typingState.typedRuby}</span>
                                                    <span>{playerInfo.typingState.targetRuby}</span>
                                                </>
                                            ) : playerInfo.currentWord?.ruby}
                                        </div>
                                        {/* Kanji height locked and vertically centered */}
                                        <div className="kanji" style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '15px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden', width: '100%' }}>
                                            <div style={{ width: '100%', wordBreak: 'break-word' }}>
                                                {(() => {
                                                    if (!playerInfo.currentWord?.text) return null;
                                                    if (!playerInfo.typingState || !playerInfo.typingState.typedRuby) return <span style={{ color: '#2c3e50' }}>{playerInfo.currentWord.text}</span>;
                                                    
                                                    const chunks = alignTextAndRuby(playerInfo.currentWord.text, playerInfo.currentWord.ruby);
                                                    let remainingTypedRuby = playerInfo.typingState.typedRuby.length;

                                                    return chunks.map((chunk, index) => {
                                                      let chunkRubyLen = chunk.ruby.length;
                                                      let chunkTypedRubyLen = Math.min(remainingTypedRuby, chunkRubyLen);
                                                      remainingTypedRuby -= chunkTypedRubyLen;

                                                      let coloredTextChars = 0;
                                                      if (chunkRubyLen > 0) {
                                                          let ratio = chunkTypedRubyLen / chunkRubyLen;
                                                          coloredTextChars = Math.floor(ratio * chunk.text.length);
                                                      } else {
                                                          coloredTextChars = remainingTypedRuby > 0 ? chunk.text.length : 0;
                                                      }
                                                      
                                                      let greenText = chunk.text.substring(0, coloredTextChars);
                                                      let blueText = chunk.text.substring(coloredTextChars);
                                                      
                                                      return (
                                                          <React.Fragment key={index}>
                                                              {greenText && <span style={{ color: '#ff9800' }}>{greenText}</span>}
                                                              {blueText && <span style={{ color: '#2c3e50' }}>{blueText}</span>}
                                                          </React.Fragment>
                                                      );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Romaji height locked and vertically centered */}
                                    <div className="target-word" style={{ fontSize: '2em', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden', width: '100%' }}>
                                        <div style={{ width: '100%', wordBreak: 'break-word' }}>
                                            {playerInfo.typingState && (
                                                <>
                                                    <span className="char typed" style={{ color: '#ff9800' }}>{playerInfo.typingState.typedRomaji}</span>
                                                    {playerInfo.typingState.targetRomaji.length > 0 && (
                                                        <span className={`char ${isMiss ? 'miss' : 'current'}`}>{playerInfo.typingState.targetRomaji[0]}</span>
                                                    )}
                                                    <span className="char">{playerInfo.typingState.targetRomaji.slice(1)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ height: '244px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <h2 style={{ color: playerInfo.hp <= 0 ? '#e53935' : '#4caf50', margin: 0 }}>
                                        {playerInfo.hp <= 0 ? 'DEFEATED! Restarting...' : 'VICTORY! Restarting...'}
                                    </h2>
                                </div>
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
                                setGameState('ready');
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
                            setGameState('ready');
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
        </div>
    );
}

// 3. Parent Component (Fixed overall size and overflow controller)
export default function Tournament({ socket, onBackToHome }) {
    const [playerName, setPlayerName] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [jobType, setJobType] = useState('CL');
    const [cpuLevel, setCpuLevel] = useState(5);
    const [gameState, setGameState] = useState('setup'); // setup, waiting, ready, countdown, playing, intermission, spectating, finished
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [lastResult, setLastResult] = useState(null);
    const [highestScore, setHighestScore] = useState(0);
    
    // Past Tournaments State
    const [pastTournaments, setPastTournaments] = useState([]);
    const [selectedPastId, setSelectedPastId] = useState('');
    const [pastScores, setPastScores] = useState([]);
    const [globalLegends, setGlobalLegends] = useState([]);

    // Socket Event Listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('tournamentState', (state) => {
            if (state.cpuLevel) {
                setCpuLevel(state.cpuLevel);
            }
            if (state.status === 'active' && gameState === 'waiting') {
                const remainingMs = state.endTime - Date.now();
                if (remainingMs > 0) {
                    setTimeRemaining(Math.ceil(remainingMs / 1000));
                    setGameState('ready'); // ready state
                } else {
                    setGameState('finished');
                }
            } else if (state.status === 'finished') {
                setGameState('finished');
            }
        });

        socket.on('tournamentStarted', (data) => {
            if (data.cpuLevel) {
                setCpuLevel(data.cpuLevel);
            }
            if (gameState === 'waiting') {
                const remainingMs = data.endTime - Date.now();
                setTimeRemaining(Math.max(0, Math.ceil(remainingMs / 1000)));
                setGameState('ready'); // ready
            }
        });

        socket.on('tournamentFinished', () => {
            setGameState('finished');
        });

        return () => {
            socket.off('tournamentState');
            socket.off('tournamentStarted');
            socket.off('tournamentFinished');
        };
    }, [socket, gameState]);

    const handleJoin = () => {
        const trimmed = nameInput.trim();
        if (/^[0-9]{1,7}$/.test(trimmed)) {
            setPlayerName(trimmed);
            socket.emit('joinTournament', { playerName: trimmed, jobType });
            setGameState('waiting');
        } else {
            alert('社員番号は1〜7桁の数字で入力してください');
        }
    };

    // Global Tournament Timer
    useEffect(() => {
        if (gameState === 'playing' || gameState === 'intermission' || gameState === 'spectating' || gameState === 'ready' || gameState === 'countdown') {
            const timer = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setGameState('finished');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState]);

    // Fetch past tournaments for setup screen
    useEffect(() => {
        if (gameState === 'setup') {
            fetch('/api/tournaments')
                .then(res => res.json())
                .then(data => {
                    const latest5 = data.slice(0, 5);
                    setPastTournaments(latest5);
                    if (latest5.length > 0) {
                        setSelectedPastId(latest5[0].id.toString());
                    }
                })
                .catch(err => console.error(err));
                
            fetch('/api/tournaments/legends')
                .then(res => res.json())
                .then(data => setGlobalLegends(data))
                .catch(err => console.error(err));
        }
    }, [gameState]);

    useEffect(() => {
        if (selectedPastId) {
            fetch(`/api/tournaments/${selectedPastId}/scores`)
                .then(res => res.json())
                .then(data => setPastScores(data))
                .catch(err => console.error(err));
        } else {
            setPastScores([]);
        }
    }, [selectedPastId]);

    if (gameState === 'setup') {
        return (
            <div className="game-container" style={{ display: 'flex', gap: '40px', maxWidth: '1000px', width: '90%' }}>
                <div style={{ flex: 1 }}>
                    <h2>イベントモード（一斉バトル）</h2>
                    {globalLegends.length > 0 && (
                        <div style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FDB931 100%)', padding: '15px', borderRadius: '10px', marginBottom: '20px', color: '#000', boxShadow: '0 4px 15px rgba(255,215,0,0.4)', maxWidth: '400px', margin: '0 auto 20px auto' }}>
                            <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', fontSize: '1.2em', textShadow: '1px 1px 2px rgba(255,255,255,0.5)' }}>👑 歴代TOP5</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: '5px' }}>
                                {globalLegends.map((l, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: i < globalLegends.length - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none', paddingBottom: '3px' }}>
                                        <span>{i+1}位: {l.user_id}</span>
                                        <span>{l.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <p style={{ color: '#888', marginBottom: '20px', textAlign: 'center' }}>社員番号を入力してイベントに参加してください</p>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', maxWidth: '400px', margin: '0 auto' }}>
                        <input
                            type="number"
                            min="1"
                            max="9999999"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value.slice(0, 7))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                            placeholder="社員番号 (1〜9999999)"
                            style={{
                                width: '100%', padding: '15px 20px', fontSize: '1.3em',
                                border: '2px solid #ddd', borderRadius: '10px', textAlign: 'center', outline: 'none'
                            }}
                        />
                        <select
                            value={jobType}
                            onChange={(e) => setJobType(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '15px 20px',
                                fontSize: '1.2em',
                                border: '2px solid #ddd',
                                borderRadius: '10px',
                                outline: 'none'
                            }}
                        >
                            <option value="CL">CL</option>
                            <option value="JAVA">JAVA</option>
                            <option value="ML">ML</option>
                            <option value="FR">FR</option>
                            <option value="QA">QA</option>
                        </select>
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
                
                <div style={{ flex: 1, background: '#f5f5f5', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginTop: 0, color: '#2c3e50' }}>📜 過去5回の結果</h3>
                    {pastTournaments.length > 0 ? (
                        <>
                            <select 
                                value={selectedPastId} 
                                onChange={(e) => setSelectedPastId(e.target.value)}
                                style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '1.1em' }}
                            >
                                {pastTournaments.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.date})</option>
                                ))}
                            </select>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#fff', borderRadius: '5px', border: '1px solid #ddd' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#eee' }}>
                                        <tr>
                                            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>順位</th>
                                            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>社員番号</th>
                                            <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>スコア</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pastScores.map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '10px', fontWeight: 'bold', color: idx === 0 ? '#d4af37' : idx === 1 ? '#9e9e9e' : idx === 2 ? '#cd7f32' : '#555' }}>
                                                    {idx + 1}
                                                </td>
                                                <td style={{ padding: '10px', fontWeight: 'bold', color: '#2c3e50' }}>{row.user_id}</td>
                                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#e8734a' }}>{row.score}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <p style={{ color: '#888', textAlign: 'center', marginTop: '50px' }}>過去のイベント履歴がありません。</p>
                    )}
                </div>
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

    return (
        <div className="game-container battle-layout" style={{ maxWidth: '1200px', width: '95%', height: '700px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: '16px', padding: '2rem', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
                <TournamentBattle
                    socket={socket}
                    playerName={playerName}
                    jobType={jobType}
                    cpuLevel={cpuLevel}
                    gameState={gameState}
                    setGameState={setGameState}
                    timeRemaining={timeRemaining}
                    lastResult={lastResult}
                    setLastResult={setLastResult}
                    highestScore={highestScore}
                    setHighestScore={setHighestScore}
                    onBackToHome={onBackToHome}
                />
                <TournamentRanking
                    socket={socket}
                    playerName={playerName}
                    jobType={jobType}
                    globalLegends={globalLegends}
                    highestScore={highestScore}
                />
            </div>
        </div>
    );
}
