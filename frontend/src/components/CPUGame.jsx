import React, { useState, useEffect, useRef } from 'react';
import { getRandomWord } from '../words';
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

export default function CPUGame({ onBackToHome }) {
    const [difficulty, setDifficulty] = useState(null);
    const [gameState, setGameState] = useState('select'); // select, playing, finished
    const [countdown, setCountdown] = useState(3);
    const [damageFlash, setDamageFlash] = useState(false);

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
    const cpuStateRef = useRef(cpuInfo); // To properly track CPU progress without stale closures
    const playerStateRef = useRef(playerInfo); // To track player HP for win conditions

    // TypingSession instances
    const pSessionRef = useRef(null);
    const cSessionRef = useRef(null);

    // Keep refs synchronized with state
    useEffect(() => { cpuStateRef.current = cpuInfo; }, [cpuInfo]);
    useEffect(() => { playerStateRef.current = playerInfo; }, [playerInfo]);

    const startBattle = (lvl) => {
        setDifficulty(lvl);
        setGameState('countdown');
        setCountdown(3);

        const pWord = getRandomWord();
        const cWord = getRandomWord();
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
                if (inputRef.current) inputRef.current.focus();
            }
        }
    }, [gameState, countdown]);

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

                // CPU types the first character of the target romaji
                const charToType = cSessionRef.current.state.targetRomaji[0];
                const res = cSessionRef.current.input(charToType);

                if (res && res.success) {
                    if (res.finishedWord) {
                        // Word Complete (calculating roughly based on ruby * 2 equivalents)
                        const damage = Math.round((currentCpu.currentWord.ruby.length * 2) * 2.4);
                        const newPlayerHp = Math.max(0, pState.hp - damage);

                        const newWord = getRandomWord();
                        cSessionRef.current = new TypingSession(newWord.ruby);

                        setPlayerInfo(prev => ({ ...prev, hp: newPlayerHp }));
                        setCpuInfo(prev => ({
                            ...prev,
                            typingState: cSessionRef.current.state,
                            currentWord: newWord
                        }));

                        // Trigger screen flash (we got hit)
                        setDamageFlash(true);
                        setTimeout(() => setDamageFlash(false), 300);

                        if (newPlayerHp <= 0) {
                            setGameState('finished');
                            setWinner('CPU');
                            return;
                        }
                    } else {
                        // Just typing
                        setCpuInfo(prev => ({ ...prev, typingState: cSessionRef.current.state }));
                    }
                }

                // Add 10% randomness to the typing speed to make it feel more human
                const variance = msPerKey * 0.1;
                const randomDelay = msPerKey + (Math.random() * variance * 2 - variance);
                cpuIntervalRef.current = setTimeout(typeNextChar, randomDelay);
            };

            cpuIntervalRef.current = setTimeout(typeNextChar, msPerKey);

            return () => {
                if (cpuIntervalRef.current) clearTimeout(cpuIntervalRef.current);
            };
        }
    }, [gameState, difficulty]);


    // Player Typing Logic
    const handleKeyDown = (e) => {
        if (gameState !== 'playing' || playerInfo.hp <= 0) return;

        // key length === 1 means a printable character
        if (e.key.length === 1) {
            const typedChar = e.key.toLowerCase();
            const res = pSessionRef.current.input(typedChar);

            if (res && res.success) {
                if (res.finishedWord) {
                    // Word Complete
                    const damage = Math.round((playerInfo.currentWord.ruby.length * 2) * 2.4);
                    const newCpuHp = Math.max(0, cpuInfo.hp - damage);

                    const newWord = getRandomWord();
                    pSessionRef.current = new TypingSession(newWord.ruby);

                    setCpuInfo(prev => ({ ...prev, hp: newCpuHp }));
                    setPlayerInfo(prev => ({
                        ...prev,
                        typingState: pSessionRef.current.state,
                        currentWord: newWord
                    }));

                    if (newCpuHp <= 0) {
                        setGameState('finished');
                        setWinner('PLAYER');
                    }
                } else {
                    // Progress within word
                    setPlayerInfo(prev => ({ ...prev, typingState: pSessionRef.current.state }));
                }
            }
        }
    };


    // --- Render Functions ---

    if (gameState === 'select') {
        return (
            <div className="game-container">
                <h2>Select CPU Difficulty</h2>

                <div className="difficulty-grid" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '20px'
                }}>
                    {[...Array(10)].map((_, i) => {
                        const level = i + 1;
                        return (
                            <button
                                key={level}
                                className="action-btn"
                                onClick={() => startBattle(level)}
                                style={{ height: '80px', fontSize: '1.2em' }}
                            >
                                Level {level}
                            </button>
                        )
                    })}
                </div>

                <button className="action-btn" onClick={onBackToHome} style={{ marginTop: '40px', background: '#555' }}>
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
                    <p>Difficulty: Level {difficulty}</p>
                    <p>Your HP: {playerInfo.hp}</p>
                    <p>CPU HP: {cpuInfo.hp}</p>
                </div>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px' }}>
                    <button className="action-btn" onClick={() => setGameState('select')}>PLAY AGAIN</button>
                    <button className="action-btn" onClick={onBackToHome} style={{ background: '#555' }}>BACK TO HOME</button>
                </div>
            </div>
        );
    }

    // Battle screen
    return (
        <div className={`game-container battle-screen ${damageFlash ? 'flash-damage' : ''}`} onKeyDown={handleKeyDown} tabIndex="0" ref={inputRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
                <button className="action-btn" onClick={onBackToHome} style={{ padding: '5px 10px', background: '#555', fontSize: '0.8em' }}>
                    Quit
                </button>
                <span style={{ fontSize: '1.5em', fontWeight: 'bold' }}>vs CPU Lv.{difficulty}</span>
            </div>

            <div className="players-hud">
                {/* Player HUD */}
                <div className={`hud-card me ${playerInfo.hp <= 0 ? 'dead' : ''}`}>
                    <div className="hud-header">
                        <span>You</span>
                        <span>{playerInfo.hp} HP</span>
                    </div>
                    <div className="hp-bar-container">
                        <div className="hp-bar" style={{ width: `${Math.max(0, playerInfo.hp) / 10}%`, backgroundColor: playerInfo.hp > 500 ? '#4caf50' : playerInfo.hp > 200 ? '#ff9800' : '#f44336' }}></div>
                    </div>
                    <div className="progress-container" style={{ marginTop: '8px', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div className="progress-bar" style={{
                            width: playerInfo.typingState ? `${(playerInfo.typingState.typedRomaji.length / Math.max(1, playerInfo.typingState.typedRomaji.length + playerInfo.typingState.targetRomaji.length)) * 100}%` : '0%',
                            backgroundColor: '#00d2ff', height: '100%', transition: 'width 0.1s'
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
                    <div className="progress-container" style={{ marginTop: '8px', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div className="progress-bar" style={{
                            width: cpuInfo.typingState ? `${(cpuInfo.typingState.typedRomaji.length / Math.max(1, cpuInfo.typingState.typedRomaji.length + cpuInfo.typingState.targetRomaji.length)) * 100}%` : '0%',
                            backgroundColor: '#e91e63', height: '100%', transition: 'width 0.1s'
                        }}></div>
                    </div>
                </div>
            </div>

            <div className="typing-area">
                {playerInfo.hp > 0 ? (
                    <>
                        <div className="target-word-japanese">
                            <div className="ruby" style={{ fontSize: '0.9em', color: '#ccc', marginBottom: '5px' }}>{playerInfo.currentWord?.ruby}</div>
                            <div className="kanji" style={{ fontSize: '2em', fontWeight: 'bold', marginBottom: '15px' }}>{playerInfo.currentWord?.text}</div>
                        </div>
                        <div className="target-word">
                            {playerInfo.typingState && (
                                <>
                                    <span className="char typed" style={{ color: '#4caf50' }}>{playerInfo.typingState.typedRomaji}</span>
                                    {playerInfo.typingState.targetRomaji.length > 0 && (
                                        <span className="char current" style={{ textDecoration: 'underline' }}>{playerInfo.typingState.targetRomaji[0]}</span>
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
