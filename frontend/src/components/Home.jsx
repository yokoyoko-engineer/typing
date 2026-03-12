import React from 'react';
import './Home.css';

export default function Home({ onSelectMode }) {
    return (
        <div className="home-container">
            <h2>Select Game Mode</h2>
            <div className="mode-buttons">
                <button
                    className="action-btn mode-btn online-btn"
                    onClick={() => onSelectMode('online')}
                >
                    🌐 ONLINE BATTLE
                    <span className="mode-desc">Play against other players</span>
                </button>
                <button
                    className="action-btn mode-btn cpu-btn"
                    onClick={() => onSelectMode('cpu')}
                >
                    🤖 CPU BATTLE
                    <span className="mode-desc">Practice against AI (10 Levels)</span>
                </button>
            </div>
        </div>
    );
}
