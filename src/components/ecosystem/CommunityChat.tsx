import { useState, useEffect, useRef } from 'react'
import { ChatMessage, getGitHubStorage, getAuthState } from '../../lib/ecosystem'

const EMOJI_CATEGORIES = [
  { name: 'Smileys', emojis: ['😀', '😂', '🥹', '😍', '🤩', '😎', '🤔', '😢', '😭', '🥳', '🤯', '🫡', '😴', '🙄', '😬', '🥺', '😤', '🤗', '😈', '💀', '👻', '🤖', '👽', '🎃', '🔥', '✨', '💫', '🌟', '⭐', '🌈'] },
  { name: 'Gestures', emojis: ['👍', '👎', '👏', '🙌', '🤝', '💪', '🫶', '✌️', '🤙', '👋', '🫰', '☝️', '👆', '👇', '👈', '👉', '🖖', '🙏', '👀', '🧠', '❤️‍🔥', '💅', '🦾', '🫂', '🏃', '🚶', '🧎', '🧑‍💻', '👨‍🚀', '🦸'] },
  { name: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '🫶', '❤️‍🩹', '🩷', '🩵', '❤️‍🔥', '❣️', '💑', '💏', '👩‍❤️‍👨', '🫀'] },
  { name: 'Objects', emojis: ['💻', '🖥️', '📱', '⌨️', '🖱️', '💾', '💿', '📀', '🖨️', '📷', '📸', '📹', '🎥', '📽️', '🎬', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏰', '📡', '🔋', '🔌', '💡', '🔦', '🪫', '🧲'] },
  { name: 'Nature', emojis: ['🌸', '🌺', '🌻', '🌹', '🌷', '🌱', '🌿', '🍀', '🍁', '🍂', '🌾', '🌵', '🌴', '🌳', '🌲', '🪵', '🍄', '🌍', '🌎', '🌏', '🌙', '⭐', '🌤️', '⛅', '🌦️', '🌈', '☀️', '🌊', '🏔️', '🏜️'] },
  { name: 'Food', emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍰', '🎂', '🍩', '🍪', '🍫', '🍬', '☕', '🍵', '🧋', '🥤', '🍺', '🍷', '🥂', '🧃', '🥛', '🍳', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🥪', '🌮'] },
]

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString()
}

export default function CommunityChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [username, setUsername] = useState('')
  const [isInCall, setIsInCall] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState(0)
  const [peers, setPeers] = useState<{ id: string; stream: MediaStream }[]>([])
  const [showFileInput, setShowFileInput] = useState(false)
  const [roomUsers, setRoomUsers] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnections = useRef<Map<string, any>>(new Map())
  const localStream = useRef<MediaStream | null>(null)
  const peerJsRef = useRef<any>(null)
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map())
  const fileChunksRef = useRef<Map<string, { data: string[]; name: string; type: string }>>(new Map())
  const roomIdRef = useRef<string>('')
  const githubStorage = useRef(getGitHubStorage())
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const auth = getAuthState()
    if (auth?.user?.login) setUsername(auth.user.login)
    loadMessages()
    return () => { leaveCall() }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    try {
      const storage = githubStorage.current
      const stored = await storage.load('chat_messages.json')
      if (stored && Array.isArray(stored)) {
        setMessages(stored.slice(-200))
        return
      }
    } catch {}
    try {
      const res = await fetch('https://raw.githubusercontent.com/zyraxon/zyraxon-chat/main/public/chat_messages.json')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setMessages(data.slice(-200))
      }
    } catch {}
  }

  async function sendMessage() {
    if (!input.trim()) return
    const msg: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      username: username || 'Anonymous',
      content: input,
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
    }
    setMessages(prev => [...prev, msg])
    setInput('')
    try {
      const storage = githubStorage.current
      const existing = await storage.load('chat_messages.json')
      const all = Array.isArray(existing) ? [...existing, msg] : [msg]
      await storage.save('chat_messages.json', all.slice(-200))
    } catch {}
    broadcastToPeers({ type: 'chat', message: msg })
  }

  function broadcastToPeers(data: any) {
    const json = JSON.stringify(data)
    dataChannels.current.forEach(ch => {
      if (ch.readyState === 'open') ch.send(json)
    })
  }

  async function startCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStream.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      setIsInCall(true)

      const roomId = 'room_' + Math.random().toString(36).slice(2, 8)
      roomIdRef.current = roomId
      await joinOrCreateRoom(roomId)
    } catch (err) {
      console.error('Failed to start call:', err)
    }
  }

  async function joinOrCreateRoom(roomId: string) {
    try {
      const storage = githubStorage.current
      const rooms = (await storage.load('active_rooms.json')) || {}
      const room = rooms[roomId]
      const existingPeers = room?.peers || []
      if (existingPeers.length >= 5) {
        alert('Room is full')
        return
      }
      rooms[roomId] = {
        peers: [...existingPeers, username || 'anon'],
        created: Date.now(),
      }
      await storage.save('active_rooms.json', rooms)
      setRoomUsers([...existingPeers, username || 'anon'])
    } catch {}

    try {
      const PeerJS = (await import('peerjs')).default
      const peer = new PeerJS(username || 'anon_' + Math.random().toString(36).slice(2, 6), {
        debug: 0,
      })
      peerJsRef.current = peer

      peer.on('open', () => {
        connectToExistingPeers()
      })

      peer.on('call', (call: any) => {
        if (localStream.current) {
          call.answer(localStream.current)
          call.on('stream', (remoteStream: MediaStream) => {
            setPeers(prev => {
              const exists = prev.find(p => p.id === call.peer)
              if (exists) return prev.map(p => p.id === call.peer ? { ...p, stream: remoteStream } : p)
              return [...prev, { id: call.peer, stream: remoteStream }]
            })
          })
        }
      })

      peer.on('connection', (conn: any) => {
        setupDataChannelHandlers(conn)
      })
    } catch {}
  }

  async function connectToExistingPeers() {
    const storage = githubStorage.current
    const rooms = (await storage.load('active_rooms.json')) || {}
    const room = rooms[roomIdRef.current]
    if (!room) return

    room.peers.forEach((peerId: string) => {
      if (peerId === username || peerJsRef.current?.id === peerId) return
      if (peerConnections.current.has(peerId)) return

      try {
        const conn = peerJsRef.current.connect(peerId)
        peerConnections.current.set(peerId, conn)
        setupDataChannelHandlers(conn)

        if (localStream.current) {
          const call = peerJsRef.current.call(peerId, localStream.current)
          if (call) {
            call.on('stream', (remoteStream: MediaStream) => {
              setPeers(prev => {
                const exists = prev.find(p => p.id === peerId)
                if (exists) return prev.map(p => p.id === peerId ? { ...p, stream: remoteStream } : p)
                return [...prev, { id: peerId, stream: remoteStream }]
              })
            })
          }
        }
      } catch {}
    })
  }

  function setupDataChannelHandlers(conn: any) {
    conn.on('open', () => {
      dataChannels.current.set(conn.peer, conn)
    })
    conn.on('data', (data: any) => {
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'chat') {
            setMessages(prev => {
              if (prev.find(m => m.id === parsed.message.id)) return prev
              return [...prev, parsed.message]
            })
          } else if (parsed.type === 'file_chunk') {
            handleFileChunk(parsed)
          } else if (parsed.type === 'file_complete') {
            handleFileComplete(parsed)
          }
        } catch {}
      }
    })
    conn.on('close', () => {
      dataChannels.current.delete(conn.peer)
      peerConnections.current.delete(conn.peer)
      setPeers(prev => prev.filter(p => p.id !== conn.peer))
    })
  }

  function handleFileChunk(chunk: any) {
    const { fileId, index, data, name, mimeType } = chunk
    if (!fileChunksRef.current.has(fileId)) {
      fileChunksRef.current.set(fileId, { data: [], name, type: mimeType })
    }
    const file = fileChunksRef.current.get(fileId)!
    file.data[index] = data
  }

  function handleFileComplete(parsed: any) {
    const { fileId } = parsed
    const file = fileChunksRef.current.get(fileId)
    if (!file) return
    const base64 = file.data.join('')
    const dataUrl = `data:${file.type};base64,${base64}`
    const msg: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      username: username || 'Anonymous',
      content: `📎 ${file.name}`,
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
      attachment: { name: file.name, type: file.type, url: dataUrl },
    }
    setMessages(prev => [...prev, msg])
    fileChunksRef.current.delete(fileId)
  }

  async function leaveCall() {
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop())
      localStream.current = null
    }
    peerJsRef.current?.destroy()
    peerJsRef.current = null
    peerConnections.current.clear()
    dataChannels.current.clear()
    fileChunksRef.current.clear()
    setPeers([])
    setIsInCall(false)

    try {
      const storage = githubStorage.current
      const rooms = (await storage.load('active_rooms.json')) || {}
      if (rooms[roomIdRef.current]) {
        rooms[roomIdRef.current].peers = rooms[roomIdRef.current].peers.filter((p: string) => p !== username)
        if (rooms[roomIdRef.current].peers.length === 0) delete rooms[roomIdRef.current]
        await storage.save('active_rooms.json', rooms)
      }
    } catch {}
    roomIdRef.current = ''
  }

  function shareFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      const fileId = Date.now().toString(36) + Math.random().toString(36).slice(2)
      const chunkSize = 16384
      const totalChunks = Math.ceil(base64.length / chunkSize)

      for (let i = 0; i < totalChunks; i++) {
        const chunk = base64.slice(i * chunkSize, (i + 1) * chunkSize)
        broadcastToPeers({
          type: 'file_chunk',
          fileId,
          index: i,
          data: chunk,
          name: file.name,
          mimeType: file.type,
        })
      }
      broadcastToPeers({ type: 'file_complete', fileId })

      const msg: ChatMessage = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        username: username || 'Anonymous',
        content: `📎 ${file.name}`,
        timestamp: Date.now(),
        likes: 0,
        likedBy: [],
        attachment: { name: file.name, type: file.type, url: `data:${file.type};base64,${base64}` },
      }
      setMessages(prev => [...prev, msg])
    }
    reader.readAsDataURL(file)
  }

  function renderContent(content: string) {
    const imageMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
    if (imageMatch) {
      return <img src={imageMatch[1]} alt="shared" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4 }} />
    }
    return <span>{content}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0f', color: '#e0e0e0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1a1a2e', background: '#0f0f1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💬</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>ZYRAXON Community</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{messages.length} messages</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { if (isInCall) leaveCall(); else startCall() }}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: isInCall ? '#dc2626' : '#10b981', color: '#fff',
            }}
          >
            {isInCall ? 'Leave Call' : 'Join Call'}
          </button>
          {isInCall && (
            <>
              <button
                onClick={() => {
                  if (localStream.current) {
                    localStream.current.getAudioTracks().forEach(t => { t.enabled = isMuted })
                    setIsMuted(!isMuted)
                  }
                }}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #333', background: isMuted ? '#dc2626' : '#1a1a2e', color: '#fff', cursor: 'pointer', fontSize: 13 }}
              >
                {isMuted ? '🔇' : '🎤'}
              </button>
              <button
                onClick={() => {
                  if (localStream.current) {
                    localStream.current.getVideoTracks().forEach(t => { t.enabled = isVideoOff })
                    setIsVideoOff(!isVideoOff)
                  }
                }}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #333', background: isVideoOff ? '#dc2626' : '#1a1a2e', color: '#fff', cursor: 'pointer', fontSize: 13 }}
              >
                {isVideoOff ? '📷' : '📹'}
              </button>
            </>
          )}
        </div>
      </div>

      {isInCall && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a2e', background: '#0f0f1a' }}>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ position: 'relative', minWidth: 160, height: 120, borderRadius: 8, overflow: 'hidden', background: '#111', border: '2px solid #6366f1' }}>
              <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#aaa' }}>You</span>
            </div>
            {peers.map(p => (
              <div key={p.id} style={{ position: 'relative', minWidth: 160, height: 120, borderRadius: 8, overflow: 'hidden', background: '#111', border: '2px solid #333' }}>
                <PeerVideo stream={p.stream} />
                <span style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#aaa' }}>{p.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map(msg => {
          const isOwn = msg.username === (username || 'Anonymous')
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '75%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  {!isOwn && (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', fontSize: 11,
                      background: `hsl(${msg.username.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 60%, 40%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600,
                    }}>
                      {msg.username[0].toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 500, color: isOwn ? '#818cf8' : '#aaa' }}>{msg.username}</span>
                  <span style={{ fontSize: 11, color: '#666' }}>{formatTime(msg.timestamp)}</span>
                </div>
                <div style={{
                  padding: '8px 12px', borderRadius: 12,
                  background: isOwn ? 'linear-gradient(135deg, #4338ca, #6366f1)' : '#1a1a2e',
                  color: '#fff', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word',
                }}>
                  {msg.attachment ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span>📎</span>
                        <a href={msg.attachment.url} download={msg.attachment.name} style={{ color: '#93c5fd', textDecoration: 'underline' }}>{msg.attachment.name}</a>
                      </div>
                      {msg.attachment.type?.startsWith('image/') && (
                        <img src={msg.attachment.url} alt={msg.attachment.name} style={{ maxWidth: '100%', borderRadius: 6, marginTop: 4 }} />
                      )}
                    </div>
                  ) : renderContent(msg.content)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, paddingLeft: 4 }}>
                  <button
                    onClick={() => {
                      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, likes: m.likes + 1 } : m))
                    }}
                    style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}
                  >
                    ❤️ {msg.likes}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {showEmojiPicker && (
        <div style={{ borderTop: '1px solid #1a1a2e', background: '#0f0f1a', padding: 8 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setSelectedEmojiCategory(i)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                  background: i === selectedEmojiCategory ? '#6366f1' : '#1a1a2e',
                  color: i === selectedEmojiCategory ? '#fff' : '#aaa',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
            {EMOJI_CATEGORIES[selectedEmojiCategory].emojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => { setInput(prev => prev + emoji); setShowEmojiPicker(false) }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4 }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '12px 16px', borderTop: '1px solid #1a1a2e', background: '#0f0f1a' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) shareFile(file)
              e.target.value = ''
            }}
          />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type a message..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid #1a1a2e',
              background: '#111', color: '#fff', fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{ background: 'none', border: 'none', color: showEmojiPicker ? '#6366f1' : '#888', cursor: 'pointer', fontSize: 18 }}
          >
            😊
          </button>
          <button
            onClick={sendMessage}
            style={{
              padding: '8px 16px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 14,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function PeerVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  return <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
}
