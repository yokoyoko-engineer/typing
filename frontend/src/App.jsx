import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Lobby from './components/Lobby'
import Game from './components/Game'
import './App.css'

function App() {
  const [socket, setSocket] = useState(null)
  const [roomState, setRoomState] = useState(null)
  const [lobbies, setLobbies] = useState([])
  const [myId, setMyId] = useState(null)
  
  useEffect(() => {
    // Viteはデフォルトでローカルホストの相対パスをフォールバックできます
    const newSocket = io('http://localhost:3001')
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

  const handleJoinRoom = (roomId, playerName) => {
    if (socket) {
      socket.emit('joinRoom', { roomId, playerName })
    }
  }

  return (
    <div className="app-main">
      <h1 className="game-title">TYPING BATTLE . IO</h1>
      
      {!roomState ? (
        <Lobby socket={socket} lobbies={lobbies} onJoinRoom={handleJoinRoom} />
      ) : (
        <Game socket={socket} roomState={roomState} myId={myId} />
      )}
    </div>
  )
}

export default App
