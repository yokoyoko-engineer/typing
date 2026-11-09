import React, { useState, useEffect, useRef } from 'react';
import { getRandomWord, CATEGORIES } from '../words';
import { JOB_TYPES } from '../jobTypes';
import { TypingSession, alignTextAndRuby, getEvaluationLevel } from '../utils/typingEngine';
import MissFlash, { useMissFlash } from './MissFlash';
import './Game.css';

const TOTAL_WORDS = 20;
const TOURNAMENT_GENRE = CATEGORIES.BUSINESS;

// 歴代・過去3か月のTOP5の表
function TopBoard({ title, rows, background, boxShadow, emptyText }) {
    return (
        <div style={{ background, boxShadow, padding: '15px', borderRadius: '10px', color: '#000', maxWidth: '400px', width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
            <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', fontSize: '1.2em', textShadow: '1px 1px 2px rgba(255,255,255,0.5)' }}>{title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: '5px' }}>
                {rows.length === 0 && <div style={{ textAlign: 'center', color: '#555' }}>{emptyText}</div>}
                {rows.map((l, i) => (
                    <div key={l.user_id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontWeight: 'bold', borderBottom: i < rows.length - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none', paddingBottom: '3px' }}>
                        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{i+1}位: {l.user_id}{l.name ? ` ${l.name}` : ''}</span>
                        <span>{l.score}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// 1. Live Ranking Component (Optimized to update independently and scrollable)
function TournamentRanking({ socket, playerName, jobType, globalLegends, highestScore }) {
    const [liveRanking, setLiveRanking] = useState([]);

    useEffect(() => {
        if (!socket) return;

        socket.emit('getTournamentLiveRanking');

        const handleUpdate = (ranking) => {
            setLiveRanking(ranking);
        };

        socket.on('tournamentLiveRanking', handleUpdate);

        return () => {
            socket.off('tournamentLiveRanking', handleUpdate);
        };
    }, [socket]);

    return (
        <div style={{ width: '480px', flex: 'none', paddingLeft: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ background: '#f5f5f5', borderRadius: '10px', padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#2c3e50' }}>
                    🔥 リアルタイムランキング
                </h3>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                    {liveRanking.length > 0 ? (
                        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '0 5px' }}>
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
                                            <td style={{ padding: '8px 5px', width: '35px', color: isLegendBeat ? '#000' : (idx < 3 ? '#e8734a' : '#888'), borderRadius: '5px 0 0 5px' }}>
                                                {idx + 1}.
                                            </td>
                                            <td title={`${entry.jobType ? `[${entry.jobType}] ` : ''}${entry.user_id}${entry.name ? ` ${entry.name}` : ''}`} style={{ padding: '8px 5px', color: isLegendBeat ? '#000' : 'inherit' }}>
                                                {/* 改行せず 1 行に収める。社員番号は切らず、長い職種名やニックネームは … で省略する */}
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                                    {isLegendBeat && <span style={{ flex: 'none' }}>👑</span>}
                                                    {entry.jobType && <span style={{ flex: 'none', maxWidth: '30%', overflow: 'hidden', textOverflow: 'ellipsis' }}>[{entry.jobType}]</span>}
                                                    <span style={{ flex: 'none' }}>{entry.user_id}</span>
                                                    {entry.name && <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 5px', width: '95px', textAlign: 'center', fontWeight: 'bold', color: isLegendBeat ? '#000' : '#ff9800' }}>
                                                {getEvaluationLevel(entry.score)}
                                            </td>
                                            <td style={{ padding: '8px 5px', width: '60px', textAlign: 'right', color: isLegendBeat ? '#000' : '#5c6bc0', borderRadius: '0 5px 5px 0' }}>
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
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                        {highestScore} <span style={{ fontSize: '0.7em', color: '#ff9800', marginLeft: '8px' }}>({getEvaluationLevel(highestScore)})</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 2. Battle (Typing) Component
function TournamentBattle({
    socket,
    playerName,
    jobType,
    gameState,
    setGameState,
    timeRemaining,
    lastResult,
    setLastResult,
    highestScore,
    setHighestScore,
    onBackToHome
}) {
    const [wordCount, setWordCount] = useState(0);
    const [currentWord, setCurrentWord] = useState(null);
    const [typingState, setTypingState] = useState(null);
    const [isMiss, setIsMiss] = useState(false);
    const { missSeq, triggerMiss, clearMiss } = useMissFlash();
    const [countdown, setCountdown] = useState(3);

    const usedWordsRef = useRef(new Set());
    const inputRef = useRef(null);
    const pSessionRef = useRef(null);
    
    const currentBattleStartRef = useRef(null);
    const playerStatsRef = useRef({ missCount: 0, totalCorrect: 0 });

    // Keep focus
    useEffect(() => {
        if ((gameState === 'playing' || gameState === 'ready') && inputRef.current) {
            inputRef.current.focus();
        }
    }, [gameState, currentWord]);

    const startNewBattle = () => {
        setIsMiss(false);
        clearMiss();
        usedWordsRef.current.clear();
        const pWord = getRandomWord(TOURNAMENT_GENRE, usedWordsRef.current);
        
        pSessionRef.current = new TypingSession(pWord.ruby, pWord.text);
        playerStatsRef.current = { missCount: 0, totalCorrect: 0 };
        currentBattleStartRef.current = Date.now();

        setWordCount(0);
        setCurrentWord(pWord);
        setTypingState(pSessionRef.current.state);
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

        if (gameState !== 'playing' || !pSessionRef.current) return;

        if (e.key.length === 1) {
            const typedChar = e.key.toLowerCase();
            const stats = playerStatsRef.current;
            const res = pSessionRef.current.input(typedChar);

            if (res && res.success) {
                stats.totalCorrect++;
                setIsMiss(false);
                if (res.finishedWord) {
                    const nextCount = wordCount + 1;
                    if (nextCount >= TOTAL_WORDS) {
                        // 20 words completed!
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
                        
                        const newHighest = Math.max(eScore, highestScore);
                        if (eScore > highestScore) {
                            setHighestScore(eScore);
                        }
                        socket.emit('tournamentUpdateScore', { playerName, score: newHighest, jobType });
                        
                        setLastResult({ status: 'completed', score: eScore, elapsed });
                        setTimeout(() => {
                            setGameState(prev => (prev === 'playing' ? 'intermission' : prev));
                        }, 800);
                    } else {
                        const newWord = getRandomWord(TOURNAMENT_GENRE, usedWordsRef.current);
                        pSessionRef.current = new TypingSession(newWord.ruby, newWord.text);
                        setWordCount(nextCount);
                        setCurrentWord(newWord);
                        setTypingState(pSessionRef.current.state);
                    }
                } else {
                    setTypingState({ ...pSessionRef.current.state });
                }
            } else {
                stats.missCount++;
                setIsMiss(true);
                triggerMiss();
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
                        20問のタイピングをクリアしてスコアを競いましょう！
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
        <div className="game-container battle-screen" onKeyDown={gameState === 'playing' ? handleKeyDown : undefined} tabIndex="0" ref={inputRef} style={{ flex: 1, height: '100%', outline: 'none', border: 'none', boxShadow: 'none', padding: 0, margin: 0, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#2c3e50' }}>イベントモード: {TOURNAMENT_GENRE}</span>
                    <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#5c6bc0', background: '#e8eaf6', padding: '6px 16px', borderRadius: '20px' }}>
                        進捗: {wordCount + 1} / {TOTAL_WORDS} 問
                    </div>
                    <span style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#e53935' }}>
                        残り時間: {formatTime(timeRemaining)}
                    </span>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', marginBottom: '20px', overflow: 'hidden' }}>
                    <div style={{ width: `${(wordCount / TOTAL_WORDS) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #5c6bc0, #3949ab)', transition: 'width 0.3s ease' }} />
                </div>

                {gameState === 'playing' && (
                    <>
                        {/* Typing Area with Fixed Height and Flex Center */}
                        <div className="typing-area" style={{ width: '100%', height: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 1.5rem', boxSizing: 'border-box', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e8e8e8' }}>
                            <MissFlash seq={missSeq} />
                            {currentWord ? (
                                <>
                                    <div className="target-word-japanese" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        {/* Ruby height locked */}
                                        <div className="ruby" style={{ fontSize: '0.9em', color: '#888', marginBottom: '5px', height: '24px', lineHeight: '24px', textAlign: 'center', overflow: 'hidden', width: '100%' }}>
                                            {typingState ? (
                                                <>
                                                    <span style={{ color: '#ff9800' }}>{typingState.typedRuby}</span>
                                                    <span>{typingState.targetRuby}</span>
                                                </>
                                            ) : currentWord?.ruby}
                                        </div>
                                        {/* Kanji height locked and vertically centered */}
                                        <div className="kanji" style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '15px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden', width: '100%' }}>
                                            <div style={{ width: '100%', wordBreak: 'break-word' }}>
                                                {(() => {
                                                    if (!currentWord?.text) return null;
                                                    if (!typingState || !typingState.typedRuby) return <span style={{ color: '#2c3e50' }}>{currentWord.text}</span>;
                                                    
                                                    const chunks = alignTextAndRuby(currentWord.text, currentWord.ruby);
                                                    let remainingTypedRuby = typingState.typedRuby.length;

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
                                            {typingState && (
                                                <>
                                                    <span className="char typed" style={{ color: '#ff9800' }}>{typingState.typedRomaji}</span>
                                                    {typingState.targetRomaji.length > 0 && (
                                                        <span className={`char ${isMiss ? 'miss' : 'current'}`}>{typingState.targetRomaji[0]}</span>
                                                    )}
                                                    <span className="char">{typingState.targetRomaji.slice(1)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ height: '244px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <h2 style={{ color: '#4caf50', margin: 0 }}>
                                        FINISH!
                                    </h2>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {gameState === 'intermission' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <h2 style={{ fontSize: '3.5em', margin: 0, color: '#4caf50' }}>
                            CLEAR! 🎉
                        </h2>
                        {lastResult && (
                            <div style={{ fontSize: '1.4em', margin: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div>今回のスコア: <span style={{ fontWeight: 'bold', color: '#5c6bc0', fontSize: '1.5em' }}>{lastResult.score}</span></div>
                                <div style={{ fontSize: '1.1em' }}>レベル: <span style={{ fontWeight: 'bold', color: '#ff9800', fontSize: '1.3em' }}>{getEvaluationLevel(lastResult.score)}</span></div>
                                {lastResult.elapsed && (
                                    <div style={{ fontSize: '0.9em', color: '#888', marginTop: '5px' }}>
                                        クリアタイム: {lastResult.elapsed.toFixed(1)} 秒
                                    </div>
                                )}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
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
                        <h2 style={{ fontSize: '3em', color: '#2c3e50', marginBottom: '10px' }}>イベント終了！</h2>
                        <div style={{ fontSize: '1.5em', margin: '15px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div>あなたの最高スコア: <span style={{ fontWeight: 'bold', color: '#5c6bc0' }}>{highestScore}</span></div>
                            <div style={{ fontSize: '1.1em' }}>レベル: <span style={{ fontWeight: 'bold', color: '#ff9800' }}>{getEvaluationLevel(highestScore)}</span></div>
                        </div>
                        <p style={{ fontSize: '1.2em', color: '#666' }}>最終ランキングをご確認ください</p>
                        <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '20px' }}>Homeへ戻る</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// 3. Parent Component (Fixed overall size and overflow controller)
// 氏名は入り直しのたびに打たなくて済むよう、タブを閉じるまでだけ覚えておく
// （研修室の共用 PC で次の人に残らないよう、localStorage ではなく sessionStorage）
// サーバの返事を待つ時間と、待機中にイベントの状態を確かめる間隔
const SERVER_REPLY_TIMEOUT_MS = 8000;
const WAITING_CHECK_INTERVAL_MS = 5000;

const DISPLAY_NAME_KEY = 'typing.displayName';
const DISPLAY_NAME_MAX = 20;
const loadDisplayName = () => { try { return sessionStorage.getItem(DISPLAY_NAME_KEY) || ''; } catch { return ''; } };
const saveDisplayName = (v) => { try { sessionStorage.setItem(DISPLAY_NAME_KEY, v); } catch { /* 保存できなくても参加はできる */ } };
// サーバと同じ条件: 前後の空白を除いて 1〜20 文字、制御文字と < > は不可
const normalizeDisplayName = (v) => v.replace(/\s+/g, ' ').trim();
const isValidDisplayName = (v) => {
    const s = normalizeDisplayName(v);
    const len = [...s].length;
    return len >= 1 && len <= DISPLAY_NAME_MAX && !/[\u0000-\u001f\u007f<>]/.test(s);
};

export default function Tournament({ socket, onBackToHome }) {
    const [playerName, setPlayerName] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [displayNameInput, setDisplayNameInput] = useState(loadDisplayName);
    const [jobType, setJobType] = useState('CL');
    const [cpuLevel, setCpuLevel] = useState(5);
    const [gameState, setGameState] = useState('setup'); // setup, waiting, ready, countdown, playing, intermission, spectating, finished
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [endTime, setEndTime] = useState(null);
    const [lastResult, setLastResult] = useState(null);
    const [highestScore, setHighestScore] = useState(0);
    
    // Past Tournaments State
    const [pastTournaments, setPastTournaments] = useState([]);
    const [selectedPastId, setSelectedPastId] = useState('');
    const [pastScores, setPastScores] = useState([]);
    const [globalLegends, setGlobalLegends] = useState([]);
    const [recentTop, setRecentTop] = useState([]);

    // 参加情報と画面の状態は ref にも持つ（ソケットのイベント処理から常に最新の値を読むため）
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;
    const highestScoreRef = useRef(highestScore);
    highestScoreRef.current = highestScore;
    const joinInfoRef = useRef(null); // { playerName, displayName, jobType }（参加ボタンを押したら入る）
    const joinSeqRef = useRef(0);
    const [connected, setConnected] = useState(() => (socket ? socket.connected : true));

    // サーバから受け取ったイベントの状態を画面に反映する（待機中のときだけ画面を進める）
    const applyTournamentState = (state) => {
        if (!state) return;
        if (state.cpuLevel) setCpuLevel(state.cpuLevel);
        if (gameStateRef.current !== 'waiting') return;
        if (state.status === 'active' && state.endTime) {
            const remainingMs = state.endTime - Date.now();
            setEndTime(state.endTime);
            if (remainingMs > 0) {
                setTimeRemaining(Math.ceil(remainingMs / 1000));
                setGameState('ready');
            } else {
                setTimeRemaining(0);
                setGameState('finished');
            }
        } else if (state.status === 'finished') {
            setTimeRemaining(0);
            setGameState('finished');
        }
    };
    const applyRef = useRef(applyTournamentState);
    applyRef.current = applyTournamentState;

    // サーバから返事が来ないときは、通信が途中で止まっているとみなして接続し直す
    // （つながり直すと下の connect の処理で参加を送り直す）。
    // 送ったときと別の接続にすでに替わっていれば何もしない（つなぎ直しを重ねない）
    const reconnect = (sentOnId) => {
        if (!socket || socket.id !== sentOnId) return;
        socket.disconnect();
        socket.connect();
    };

    // 参加をサーバに送る。返事で今のイベント状態を受け取る
    const sendJoin = () => {
        const info = joinInfoRef.current;
        if (!socket || !info || !socket.connected) return; // 未接続ならつながったときに送る
        const seq = ++joinSeqRef.current;
        const sentOnId = socket.id;
        socket.timeout(SERVER_REPLY_TIMEOUT_MS).emit('joinTournament', info, (err, res) => {
            if (seq !== joinSeqRef.current || !joinInfoRef.current) return;
            if (err) { reconnect(sentOnId); return; }
            if (res && res.error) {
                joinInfoRef.current = null;
                alert(res.error);
                setGameState('setup');
                return;
            }
            applyRef.current(res);
        });
    };
    const sendJoinRef = useRef(sendJoin);
    sendJoinRef.current = sendJoin;

    // Socket Event Listeners（ソケットごとに 1 回だけ登録する）
    useEffect(() => {
        if (!socket) return;

        const onState = (state) => applyRef.current(state);
        const onStarted = (data) => applyRef.current({ ...data, status: 'active' });
        const onFinished = () => {
            setTimeRemaining(0);
            setGameState('finished');
        };
        // 通信が切れてつながり直すと、サーバ側では別の接続として扱われ、イベントの参加者から外れる。
        // 参加済みなら送り直し、開催中なら自分の最高スコアも送り直す（切れている間に送ったものが届いていないことがある）
        const onConnect = () => {
            setConnected(true);
            const info = joinInfoRef.current;
            if (!info) return;
            sendJoinRef.current();
            if (highestScoreRef.current > 0 && gameStateRef.current !== 'waiting' && gameStateRef.current !== 'finished') {
                socket.emit('tournamentUpdateScore', { playerName: info.playerName, score: highestScoreRef.current, jobType: info.jobType });
            }
        };
        const onDisconnect = () => setConnected(false);

        socket.on('tournamentState', onState);
        socket.on('tournamentStarted', onStarted);
        socket.on('tournamentFinished', onFinished);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        setConnected(socket.connected);

        return () => {
            socket.off('tournamentState', onState);
            socket.off('tournamentStarted', onStarted);
            socket.off('tournamentFinished', onFinished);
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [socket]);

    // 待機中は数秒おきにイベントの状態を確かめる。開始の通知を取りこぼしても、ここで開始に気づける。
    // 返事が来なければ接続し直す（つながり直すと参加も送り直す）
    useEffect(() => {
        if (gameState !== 'waiting' || !socket) return;
        const timer = setInterval(() => {
            if (!socket.connected) return;
            const sentOnId = socket.id;
            socket.timeout(SERVER_REPLY_TIMEOUT_MS).emit('getTournamentState', (err, state) => {
                if (err) { reconnect(sentOnId); return; }
                applyRef.current(state);
            });
        }, WAITING_CHECK_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [gameState, socket]);

    // 画面を離れたら（退出）、再接続時に参加を送り直さない
    useEffect(() => () => { joinInfoRef.current = null; }, []);

    const canJoin = /^[0-9]{1,7}$/.test(nameInput.trim()) && isValidDisplayName(displayNameInput);

    const handleJoin = () => {
        const trimmed = nameInput.trim();
        if (!/^[0-9]{1,7}$/.test(trimmed)) {
            alert('社員番号は1〜7桁の数字で入力してください');
            return;
        }
        if (!isValidDisplayName(displayNameInput)) {
            alert(`氏名（ニックネーム）を入力してください（${DISPLAY_NAME_MAX}文字以内、< > は使えません）`);
            return;
        }
        const displayName = normalizeDisplayName(displayNameInput);
        saveDisplayName(displayName);
        setPlayerName(trimmed);
        joinInfoRef.current = { playerName: trimmed, displayName, jobType };
        gameStateRef.current = 'waiting'; // 返事が描画より先に届いても待機中として扱う
        setGameState('waiting');
        sendJoin();
    };

    // Global Tournament Timer
    useEffect(() => {
        if ((gameState === 'playing' || gameState === 'intermission' || gameState === 'spectating' || gameState === 'ready' || gameState === 'countdown') && endTime) {
            const updateTimer = () => {
                const remainingMs = endTime - Date.now();
                if (remainingMs <= 0) {
                    setTimeRemaining(0);
                    setGameState('finished');
                } else {
                    setTimeRemaining(Math.ceil(remainingMs / 1000));
                }
            };

            updateTimer();
            const timer = setInterval(updateTimer, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState, endTime]);

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
                
            socket?.emit('getTournamentBoard', ({ allTime, recent }) => {
                setGlobalLegends(allTime);
                setRecentTop(recent);
            });
        }
    }, [gameState, socket]);

    useEffect(() => {
        if (!selectedPastId || !socket) {
            setPastScores([]);
            return;
        }
        let stale = false;
        socket.emit('getTournamentScores', Number(selectedPastId), (rows) => {
            if (!stale) setPastScores(rows);
        });
        return () => { stale = true; };
    }, [selectedPastId, socket]);

    if (gameState === 'setup') {
        return (
            <div className="game-container" style={{ maxWidth: '900px', width: '90%' }}>
                <h2>イベントモード（一斉バトル）</h2>
                <p style={{ color: '#888', marginBottom: '20px', textAlign: 'center' }}>社員番号と氏名（ニックネーム）を入力してイベントに参加してください</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
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
                    <input
                        type="text"
                        value={displayNameInput}
                        maxLength={DISPLAY_NAME_MAX}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleJoin(); }}
                        placeholder="氏名（ニックネーム）"
                        autoComplete="name"
                        style={{
                            width: '100%', padding: '15px 20px', fontSize: '1.3em',
                            border: '2px solid #ddd', borderRadius: '10px', textAlign: 'center', outline: 'none'
                        }}
                    />
                    <p style={{ margin: '-8px 0 0', fontSize: '0.85em', color: '#999', textAlign: 'center' }}>
                        氏名（ニックネーム）はランキングと過去の結果に表示されます
                    </p>
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
                        {JOB_TYPES.map(job => (
                            <option key={job} value={job}>{job}</option>
                        ))}
                    </select>
                    <button
                        className="action-btn"
                        onClick={handleJoin}
                        disabled={!canJoin}
                        style={{ width: '100%', height: '55px', fontSize: '1.2em' }}
                    >
                        待機室へ入る
                    </button>
                </div>
                <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '20px', background: '#e0e0e0', color: '#2c3e50' }}>
                    Back to Home
                </button>

                {/* 参加の入力欄が主役なので、記録は入力欄の下にまとめる */}
                <div style={{ width: '100%', maxWidth: '820px', marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {globalLegends.length > 0 && (
                            <div style={{ flex: '1 1 340px', minWidth: 0 }}>
                                <TopBoard
                                    title="👑 歴代TOP5"
                                    rows={globalLegends}
                                    background="linear-gradient(135deg, #FFD700 0%, #FDB931 100%)"
                                    boxShadow="0 4px 15px rgba(255,215,0,0.4)"
                                />
                            </div>
                        )}
                        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
                            <TopBoard
                                title="🏅 過去3か月のTOP5"
                                rows={recentTop}
                                background="linear-gradient(135deg, #CFD8DC 0%, #90A4AE 100%)"
                                boxShadow="0 4px 15px rgba(96,125,139,0.3)"
                                emptyText="過去3か月の記録はありません"
                            />
                        </div>
                    </div>
                    <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
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
                                                <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>ニックネーム</th>
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
                                                    <td style={{ padding: '10px', color: '#2c3e50', overflowWrap: 'anywhere' }}>{row.name || '—'}</td>
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
            </div>
        );
    }

    if (gameState === 'waiting') {
        return (
            <div className="game-container">
                <h2>待機中...</h2>
                <p style={{ fontSize: '1.2em', color: '#5c6bc0' }}>管理者がイベントを開始するのをお待ちください</p>
                {!connected && (
                    <p role="status" style={{ color: '#e65100', fontWeight: 'bold', marginTop: '10px' }}>
                        サーバとの通信が切れたため、つなぎ直しています。このままお待ちください。
                    </p>
                )}
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
