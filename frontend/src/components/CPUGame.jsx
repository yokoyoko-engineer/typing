import React, { useState, useEffect, useRef } from 'react';
import { getRandomWord, CATEGORIES, CLOUD_GENRES, GENRES_BY_CATEGORY } from '../words';
import { TypingSession, alignTextAndRuby, getEvaluationLevel } from '../utils/typingEngine';
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

// API calls will now automatically be routed through the Vite/Nginx proxy


export default function CPUGame({ onBackToHome }) {
    const [playerName, setPlayerName] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [jobType, setJobType] = useState('CL');
    const [difficulty, setDifficulty] = useState(null);
    const [category, setCategory] = useState(null);
    const [genre, setGenre] = useState(null);
    const [gameState, setGameState] = useState('select'); // select, countdown, playing, finished
    const [selectionStep, setSelectionStep] = useState('username'); // username, category, genre, difficulty
    const [countdown, setCountdown] = useState(3);
    const usedWordsRef = useRef(new Set());
    const [damageFlash, setDamageFlash] = useState(false);
    const [isMiss, setIsMiss] = useState(false);
    const [previewLevel, setPreviewLevel] = useState(1);

    // Timer
    const [battleStartTime, setBattleStartTime] = useState(null);
    const [battleElapsed, setBattleElapsed] = useState(0);
    const [finalTime, setFinalTime] = useState(null);
    const [latestRankings, setLatestRankings] = useState([]);
    
    // Rankings state cache for the selected genre
    const [allRankings, setAllRankings] = useState({});

    // Overall e-typing score rankings
    const [overallTopScores, setOverallTopScores] = useState([]);

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
    const playerStatsRef = useRef({ missCount: 0, keyMisses: {}, keyLatencies: {}, lastKeyTime: null, totalCorrect: 0 });

    useEffect(() => { cpuStateRef.current = cpuInfo; }, [cpuInfo]);
    useEffect(() => { playerStateRef.current = playerInfo; }, [playerInfo]);

    // Focus name input on mount
    useEffect(() => {
        if (selectionStep === 'username' && nameInputRef.current) {
            nameInputRef.current.focus();
        }
    }, [selectionStep]);

    // Fetch overall top scores on mount
    useEffect(() => {
        if (selectionStep === 'username') {
            fetch('/api/scores/top')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setOverallTopScores(data);
                })
                .catch(err => console.error("Error fetching top scores:", err));
        }
    }, [selectionStep]);

    const confirmName = () => {
        const trimmed = nameInput.trim();
        if (/^[0-9]{1,7}$/.test(trimmed)) {
            setPlayerName(trimmed);
            setSelectionStep('category');
        } else {
            alert('社員番号は1〜7桁の数字で入力してください');
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

    // Fetch rankings when genre is selected
    useEffect(() => {
        if (genre && selectionStep === 'difficulty') {
            fetchAllRankings(genre);
        }
    }, [genre, selectionStep]);

    const fetchAllRankings = async (g) => {
        try {
            const newRankings = {};
            // Fetch all 10 levels in parallel
            const promises = Array.from({ length: 10 }, (_, i) => i + 1).map(async (level) => {
                const res = await fetch(`/api/rankings/${encodeURIComponent(g)}/${level}`);
                if (res.ok) {
                    newRankings[level] = await res.json();
                } else {
                    newRankings[level] = [];
                }
            });
            await Promise.all(promises);
            setAllRankings(newRankings);
        } catch (error) {
            console.error('Failed to fetch rankings', error);
        }
    };

    const startBattle = (lvl) => {
        setDifficulty(lvl);
        setGameState('countdown');
        setCountdown(3);
        setFinalTime(null);
        usedWordsRef.current = new Set();

        const pWord = getRandomWord(genre, usedWordsRef.current);
        const cWord = getRandomWord(genre, usedWordsRef.current);
        pSessionRef.current = new TypingSession(pWord.ruby, pWord.text);
        cSessionRef.current = new TypingSession(cWord.ruby, cWord.text);
        playerStatsRef.current = { missCount: 0, keyMisses: {}, keyLatencies: {}, lastKeyTime: null, totalCorrect: 0 };

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
                        const newWord = getRandomWord(genre, usedWordsRef.current);
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
            const now = Date.now();
            const stats = playerStatsRef.current;
            const res = pSessionRef.current.input(typedChar);

            if (res && res.success) {
                stats.totalCorrect++;
                if (stats.lastKeyTime) {
                    const latency = now - stats.lastKeyTime;
                    if (latency < 2000) {
                        if (!stats.keyLatencies[typedChar]) stats.keyLatencies[typedChar] = [];
                        stats.keyLatencies[typedChar].push(latency);
                    }
                }
                stats.lastKeyTime = now;
                setIsMiss(false);
                if (res.finishedWord) {
                    const newWord = getRandomWord(genre, usedWordsRef.current);
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
                        const elapsed = ((Date.now() - battleStartTime) / 1000);
                        const roundedTime = Math.round(elapsed * 100) / 100;
                        setFinalTime(roundedTime);
                        setGameState('finished');
                        setWinner('PLAYER');

                        // Calculate e-typing score
                        const totalCorrect = stats.totalCorrect;
                        const totalMiss = stats.missCount;
                        const totalTyped = totalCorrect + totalMiss;
                        let eScore = 0;
                        if (totalTyped > 0 && elapsed > 0) {
                            const wpm = totalCorrect / (elapsed / 60);
                            const accuracy = totalCorrect / totalTyped;
                            eScore = Math.round(wpm * Math.pow(accuracy, 3));
                        }
                        
                        // Save score in ref so it can be displayed
                        stats.finalScore = eScore;

                        // Save e-typing score to SQLite
                        fetch('/api/scores', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: playerName, score: eScore, jobType })
                        }).catch(err => console.error("Error saving score:", err));

                        // Save ranking to backend
                        fetch(`/api/rankings/${encodeURIComponent(genre)}/${difficulty}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: playerName, time: roundedTime, jobType, score: eScore })
                        })
                        .then(res => res.json())
                        .then(updated => {
                            setLatestRankings(updated);
                            // Also update the allRankings state so if they play again it's fresh
                            setAllRankings(prev => ({
                                ...prev,
                                [difficulty]: updated
                            }));
                        })
                        .catch(err => console.error("Error saving ranking:", err));
                    }
                } else {
                    setPlayerInfo(prev => ({ ...prev, typingState: pSessionRef.current.state }));
                }
            } else {
                stats.missCount++;
                if (/^[a-z0-9\-']$/.test(typedChar)) {
                    stats.keyMisses[typedChar] = (stats.keyMisses[typedChar] || 0) + 1;
                }
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
                    <h2>社員番号を入力</h2>
                    <p style={{ color: '#888', fontSize: '0.9em', marginBottom: '20px' }}>ランキングに表示される社員番号です</p>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', maxWidth: '400px', margin: '0 auto' }}>
                        <input
                            ref={nameInputRef}
                            type="number"
                            min="1"
                            max="9999999"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value.slice(0, 7))}
                            onKeyDown={(e) => { if (e.key === 'Enter') confirmName(); }}
                            placeholder="社員番号 (1〜9999999)"
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
                            onClick={confirmName}
                            disabled={!/^[0-9]{1,7}$/.test(nameInput.trim())}
                            style={{
                                width: '100%',
                                height: '55px',
                                fontSize: '1.2em',
                                opacity: !/^[0-9]{1,7}$/.test(nameInput.trim()) ? 0.5 : 1,
                            }}
                        >
                            決定
                        </button>
                    </div>

                    {/* Overall Ranking Panel */}
                    <div style={{ marginTop: '40px', maxWidth: '400px', margin: '40px auto 0', background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 15px', color: '#2c3e50', fontSize: '1.2em', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ marginRight: '8px' }}>👑</span> 総合 ハイスコアランキング
                        </h3>
                        {overallTopScores.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {overallTopScores.map((entry, idx) => {
                                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                                    return (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 15px',
                                            borderRadius: '8px',
                                            background: idx % 2 === 0 ? '#f9f9f9' : '#fff',
                                            border: '1px solid #eee',
                                        }}>
                                            <span style={{ minWidth: '35px', textAlign: 'center', fontSize: '1.2em' }}>{medal}</span>
                                            <span style={{ flex: 1, textAlign: 'left', paddingLeft: '10px', color: '#2c3e50', fontWeight: 'bold' }}>{entry.job_type ? `[${entry.job_type}] ` : ''}{entry.user_id}</span>
                                            <span style={{ fontWeight: 'bold', color: '#e8734a', minWidth: '80px', textAlign: 'right', fontSize: '1.1em' }}>{entry.score}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#aaa', margin: '20px 0' }}>まだ記録がありません</p>
                        )}
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
        const previewRankings = allRankings[previewLevel] || [];
        return (
            <div className="game-container" style={{ maxWidth: '900px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                    <button onClick={() => {
                        if (category === CATEGORIES.KOTOWAZA || category === CATEGORIES.BUSINESS) {
                            setSelectionStep('category');
                        } else {
                            setSelectionStep('genre');
                        }
                    }} style={{ background: 'none', border: 'none', color: '#5c6bc0', cursor: 'pointer', fontSize: '1.1em' }}>‹ 戻る</button>
                    <h2>難易度を選択 ({genre})</h2>
                </div>

                <div className="difficulty-ranking-layout">
                    {/* Left: Difficulty buttons */}
                    <div className="difficulty-panel">
                        <div className="difficulty-grid" style={{
                            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px'
                        }}>
                            {[...Array(10)].map((_, i) => {
                                const level = i + 1;
                                const levelRankings = allRankings[level] || [];
                                const bestTime = levelRankings.length > 0 ? levelRankings[0].time : null;
                                return (
                                    <button
                                        key={level}
                                        className={`action-btn ${previewLevel === level ? 'preview-active' : ''}`}
                                        onClick={() => startBattle(level)}
                                        onMouseEnter={() => setPreviewLevel(level)}
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
                        <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '30px', background: '#e0e0e0', color: '#2c3e50', width: '100%' }}>
                            Back to Home
                        </button>
                    </div>

                    {/* Right: Ranking TOP10 preview */}
                    <div className="ranking-preview-panel">
                        <h3 style={{ margin: '0 0 15px', color: '#2c3e50', fontSize: '1.1em', textAlign: 'center' }}>
                            🏆 ランキング TOP10 — Lv.{previewLevel}
                        </h3>
                        {previewRankings.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {previewRankings.slice(0, 10).map((entry, idx) => {
                                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                                    return (
                                        <div key={idx} className="ranking-row" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            background: idx % 2 === 0 ? '#f9f9f9' : '#fff',
                                            border: '1px solid #eee',
                                        }}>
                                            <span style={{ minWidth: '35px', textAlign: 'center' }}>{medal}</span>
                                            <span style={{ flex: 1, textAlign: 'left', paddingLeft: '10px', color: '#2c3e50' }}>{entry.jobType ? `[${entry.jobType}] ` : ''}{entry.username}</span>
                                            <span style={{ fontWeight: 'bold', color: '#e8734a', minWidth: '90px', textAlign: 'right' }}>
                                                {entry.time}s 
                                                <span style={{ color: '#5c6bc0', fontSize: '0.9em', marginLeft: '5px' }}>
                                                    {entry.score !== undefined ? `★${entry.score}` : ''}
                                                </span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="ranking-empty">
                                <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.95em', margin: '30px 0' }}>
                                    まだ記録がありません
                                </p>
                            </div>
                        )}
                    </div>
                </div>
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
        const stats = playerStatsRef.current;
        const topMisses = Object.entries(stats.keyMisses).map(([k, c]) => ({ k, c })).sort((a,b) => b.c - a.c).slice(0,3);
        const topSlow = Object.entries(stats.keyLatencies).map(([k, times]) => ({
            k, avg: Math.round(times.reduce((a,b) => a+b, 0) / times.length)
        })).sort((a,b) => b.avg - a.avg).slice(0,3);

        return (
            <div className="game-container result-screen">
                <h2>Game Over!</h2>
                {winner === 'PLAYER' ? (
                    <h1 className="winner-text">YOU WON!</h1>
                ) : (
                    <h1 className="loser-text">YOU LOST...</h1>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px', marginTop: '15px' }}>
                    {/* Left Column: Game Info & Ranking & Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '220px', maxWidth: '350px' }}>
                        <div style={{ background: '#f8f9fa', padding: '10px 15px', borderRadius: '8px' }}>
                            <p style={{ margin: '3px 0', fontSize:'0.9em' }}>プレイヤー: {playerName}</p>
                            <p style={{ margin: '3px 0', fontSize:'0.9em' }}>ジャンル: {genre}</p>
                            <p style={{ margin: '3px 0', fontSize:'0.9em' }}>難易度: Level {difficulty}</p>
                            {finalTime !== null && (
                                <>
                                    <p style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#e8734a', margin: '5px 0 0 0' }}>
                                        ⏱ クリア: {finalTime}秒
                                    </p>
                                    <p style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#d4af37', margin: '5px 0 0 0' }}>
                                        ⭐ スコア: {stats.finalScore || 0}
                                    </p>
                                    <p style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#ff9800', margin: '5px 0 0 0' }}>
                                        🏷️ レベル: {getEvaluationLevel(stats.finalScore || 0)}
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Ranking display */}
                        {winner === 'PLAYER' && latestRankings.length > 0 && (
                            <div style={{
                                background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px',
                                padding: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                            }}>
                                <h3 style={{ margin: '0 0 10px', color: '#2c3e50', fontSize: '1em' }}>
                                    🏆 TOP30 — Lv.{difficulty}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85em', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                                    {latestRankings.slice(0, 30).map((entry, idx) => { // show up to top 30
                                        const isMe = entry.time === finalTime && entry.username === playerName;
                                        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                                        return (
                                            <div key={idx} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '4px 8px', borderRadius: '6px',
                                                background: isMe ? '#ede7f6' : (idx % 2 === 0 ? '#f9f9f9' : '#fff'),
                                                border: isMe ? '2px solid #5c6bc0' : '1px solid transparent',
                                                fontWeight: isMe ? 'bold' : 'normal',
                                            }}>
                                                <span style={{ minWidth: '25px', textAlign: 'center' }}>{medal}</span>
                                                <span style={{ flex: 1, textAlign: 'left', paddingLeft: '5px', color: '#2c3e50', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.username}</span>
                                                <span style={{ fontWeight: 'bold', color: '#e8734a', minWidth: '50px', textAlign: 'right' }}>{entry.time}s {entry.score ? `(★${entry.score})` : ''}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: 'auto' }}>
                            <button className="action-btn" style={{ padding: '10px' }} onClick={() => {
                                setGameState('select');
                                setSelectionStep('category');
                            }}>PLAY AGAIN</button>
                            <button className="action-btn" onClick={onBackToHome} style={{ padding: '10px', background: '#e0e0e0', color: '#2c3e50' }}>HOME</button>
                        </div>
                    </div>

                    {/* Right Column: Tracking Stats */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: '15px'
                    }}>
                        <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', minWidth: '160px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <h4 style={{ margin: '0 0 10px', color: '#5c6bc0' }}>ミスタイプ</h4>
                            <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#e53935' }}>{stats.missCount} <span style={{fontSize:'0.4em', color:'#888'}}>回</span></div>
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
                            <div className="ruby" style={{ fontSize: '0.9em', color: '#888', marginBottom: '5px' }}>
                                {playerInfo.typingState ? (
                                    <>
                                        <span style={{ color: '#ff9800' }}>{playerInfo.typingState.typedRuby}</span>
                                        <span>{playerInfo.typingState.targetRuby}</span>
                                    </>
                                ) : playerInfo.currentWord?.ruby}
                            </div>
                            <div className="kanji" style={{ fontSize: '2em', fontWeight: 'bold', marginBottom: '15px' }}>
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
                        <div className="target-word">
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
