import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Lobby from './components/Lobby'
import Game from './components/Game'
import Home from './components/Home'
import CPUGame from './components/CPUGame'
import './App.css'

function App() {
  const [socket, setSocket] = useState(null)
  const [roomState, setRoomState] = useState(null)
  const [lobbies, setLobbies] = useState([])
  const [myId, setMyId] = useState(null)
  const [gameMode, setGameMode] = useState('home') // 'home', 'online', 'cpu'

  useEffect(() => {
    // Viteのプロキシを経由するため、ホスト名やポートの指定をなくします
    const newSocket = io()
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setMyId(newSocket.id)
    })

    newSocket.on('lobbiesState', (states) => {
      setLobbies(states)
    })

    newSocket.on('roomState', (state) => {
      setRoomState(state)
    })

    newSocket.on('error', (msg) => {
      alert(msg)
    })

    return () => newSocket.close()
  }, [])

  const handleSelectMode = (mode) => {
    setGameMode(mode)
  }

  const handleJoinRoom = (roomId, playerName) => {
    if (socket) {
      socket.emit('joinRoom', { roomId, playerName })
    }
  }

  return (
    <div className="app-main">
      <h1 className="game-title" style={{ cursor: gameMode !== 'home' ? 'pointer' : 'default' }} onClick={() => setGameMode('home')}>TYPING BATTLE . IO</h1>

      {gameMode === 'home' && (
        <Home onSelectMode={handleSelectMode} />
      )}

      {gameMode === 'cpu' && (
        <CPUGame onBackToHome={() => setGameMode('home')} />
      )}

      {gameMode === 'online' && (
        !roomState ? (
          <div>
            <button className="action-btn" onClick={() => setGameMode('home')} style={{ marginBottom: '20px', background: '#e0e0e0', color: '#2c3e50' }}>
              {'< Back to Mode Select'}
            </button>
            <Lobby socket={socket} lobbies={lobbies} onJoinRoom={handleJoinRoom} />
          </div>
        ) : (
          <Game socket={socket} roomState={roomState} myId={myId} />
        )
      )}
    </div>
  )
}

export default App
