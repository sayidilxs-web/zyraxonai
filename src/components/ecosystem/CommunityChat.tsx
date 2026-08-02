import { useState, useEffect, useRef, useCallback } from "react"
import { ChatMessage, getGitHubStorage, getAuthState } from "../../lib/ecosystem"
import { CommunityRealtime } from "../../lib/community-realtime"

const MAX_PEERS_PER_ROOM = 5
const ROOM_PREFIX = "zyraxon-room"
const MESSAGES_POLL_INTERVAL = 10000
const GITHUB_API = "https://api.github.com"
const ECOSYSTEM_DATA_REPO = "onelpawarai/zyraxon-ecosystem-data"

const EMOJI_CATEGORIES = [
  { name: "Smileys", emojis: ["😀","😂","🥹","😍","🤩","😎","🤔","😢","😭","🥳","🤯","🫡","😴","🙄","😬","🥺","😤","🤗","😈","💀","👻","🤖","👽","🎃","🔥","✨","💫","🌟","⭐","🌈"] },
  { name: "Gestures", emojis: ["👍","👎","👏","🙌","🤝","💪","🫶","✌️","🤙","👋","🫰","☝️","👆","👇","👈","👉","🖖","🙏","👀","🧠","❤️‍🔥","💅","🦾","🫂","🏃","🚶","🧎","🧑‍💻","👨‍🚀","🦸"] },
  { name: "Hearts", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","🫶","❤️‍🩹","🩷","🩵","❤️‍🔥","❣️","💑","💏","👩‍❤️‍👨","🫀"] },
  { name: "Objects", emojis: ["💻","🖥️","📱","⌨️","🖱️","💾","💿","📀","🖨️","📷","📸","📹","🎥","📽️","🎬","📺","📻","🎙️","🎚️","🎛️","🧭","⏱️","⏰","📡","🔋","🔌","💡","🔦","🪫","🧲"] },
  { name: "Nature", emojis: ["🌸","🌺","🌻","🌹","🌷","🌱","🌿","🍀","🍁","🍂","🌾","🌵","🌴","🌳","🌲","🪵","🍄","🌍","🌎","🌏","🌙","⭐","🌤️","⛅","🌦️","🌈","☀️","🌊","🏔️","🏜️"] },
  { name: "Food", emojis: ["🍕","🍔","🍟","🌭","🍿","🧁","🍰","🎂","🍩","🍪","🍫","🍬","☕","🍵","🧋","🥤","🍺","🍷","🥂","🧃","🥛","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🥪","🌮"] },
]

function formatTime(ts: string | number) {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString()
}

function getAvatarUrl(username: string) {
  return `https://github.com/${username}.png`
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function CommunityChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isInCall, setIsInCall] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState(0)
  const [peers, setPeers] = useState<{ id: string; stream: MediaStream }[]>([])
  const [roomUsers, setRoomUsers] = useState<string[]>([])
  const [rtPeers, setRtPeers] = useState<{ id: string; username: string; stream: MediaStream }[]>([])
  const rtRef = useRef<CommunityRealtime | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnections = useRef<Map<string, any>>(new Map())
  const localStream = useRef<MediaStream | null>(null)
  const peerJsRef = useRef<any>(null)
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map())
  const fileChunksRef = useRef<Map<string, { data: string[]; name: string; type: string }>>(new Map())
  const roomIdRef = useRef<string>("")
  const githubStorage = useRef(getGitHubStorage())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const authRef = useRef(getAuthState())

  const loadMessages = useCallback(async () => {
    try {
      const storage = githubStorage.current
      if (storage) {
        const msgs = await storage.getChatMessages()
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages(msgs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(-200))
          return
        }
      }
    } catch {}

    try {
      const response = await fetch(
        `${GITHUB_API}/repos/${ECOSYSTEM_DATA_REPO}/contents/community_chat.json`,
        { headers: { Accept: "application/vnd.github.v3+json" } }
      )
      if (response.ok) {
        const data = await response.json()
        if (data.content) {
          const decoded = JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, "")))))
          if (Array.isArray(decoded) && decoded.length > 0) {
            setMessages(decoded.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(-200))
          }
        }
      }
    } catch {}
  }, [])

  const loadRoomsFromGitHub = useCallback(async (): Promise<Record<string, number>> => {
    try {
      const response = await fetch(
        `${GITHUB_API}/repos/${ECOSYSTEM_DATA_REPO}/contents/active_rooms.json`,
        { headers: { Accept: "application/vnd.github.v3+json" } }
      )
      if (response.ok) {
        const data = await response.json()
        if (data.content) {
          return JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, "")))))
        }
      }
    } catch {}
    return {}
  }, [])

  const saveRoomsToGitHub = useCallback(async (rooms: Record<string, number>) => {
    try {
      const storage = githubStorage.current
      if (storage) {
        await (storage as any).updateFile("active_rooms.json", rooms, "Update active call rooms")
      }
    } catch {}
  }, [])

  const findAvailableRoom = useCallback(async (): Promise<string> => {
    const rooms = await loadRoomsFromGitHub()
    const roomEntries = typeof rooms === "object" && !Array.isArray(rooms) ? rooms : {}
    for (let i = 0; i < 1000; i++) {
      const roomId = `${ROOM_PREFIX}-${i}`
      const count = roomEntries[roomId] || 0
      if (count < MAX_PEERS_PER_ROOM) return roomId
    }
    return `${ROOM_PREFIX}-${Date.now()}`
  }, [loadRoomsFromGitHub])

  const broadcastToPeers = useCallback((data: any) => {
    const json = JSON.stringify(data)
    dataChannels.current.forEach((ch) => {
      if (ch.readyState === "open") ch.send(json)
    })
  }, [])

  const handleFileChunk = useCallback((chunk: any) => {
    const { fileId, index, data, name, mimeType } = chunk
    if (!fileChunksRef.current.has(fileId)) {
      fileChunksRef.current.set(fileId, { data: [], name, type: mimeType })
    }
    const file = fileChunksRef.current.get(fileId)!
    file.data[index] = data
  }, [])

  const handleFileComplete = useCallback(
    (parsed: any) => {
      const { fileId } = parsed
      const file = fileChunksRef.current.get(fileId)
      if (!file) return
      const base64 = file.data.join("")
      const dataUrl = `data:${file.type};base64,${base64}`
      const auth = authRef.current
      const msg: ChatMessage = {
        id: generateId(),
        userId: auth.user?.id || "anon",
        username: auth.user?.username || "Sign in to join",
        avatarUrl: auth.user?.avatarUrl || "",
        content: `📎 ${file.name}`,
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: [],
      }
      setMessages((prev) => [...prev, msg])
      fileChunksRef.current.delete(fileId)
    },
    []
  )

  const setupDataChannelHandlers = useCallback(
    (conn: any) => {
      conn.on("open", () => {
        dataChannels.current.set(conn.peer, conn)
      })
      conn.on("data", (data: any) => {
        if (typeof data === "string") {
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === "chat") {
              setMessages((prev) => {
                if (prev.find((m) => m.id === parsed.message.id)) return prev
                return [...prev, parsed.message]
              })
            } else if (parsed.type === "file_chunk") {
              handleFileChunk(parsed)
            } else if (parsed.type === "file_complete") {
              handleFileComplete(parsed)
            }
          } catch {}
        }
      })
      conn.on("close", () => {
        dataChannels.current.delete(conn.peer)
        peerConnections.current.delete(conn.peer)
        setPeers((prev) => prev.filter((p) => p.id !== conn.peer))
      })
    },
    [handleFileChunk, handleFileComplete]
  )

  const connectToExistingPeers = useCallback(async () => {
    const rooms = await loadRoomsFromGitHub()
    const roomEntries = typeof rooms === "object" && !Array.isArray(rooms) ? rooms : {}
    const existingPeers = roomEntries[roomIdRef.current] || 0
    const myPeerId = peerJsRef.current?.id
    if (!myPeerId) return

    for (let i = 0; i < existingPeers; i++) {
      const tryPeerId = `${roomIdRef.current}-peer-${i}`
      if (tryPeerId === myPeerId) continue
      if (peerConnections.current.has(tryPeerId)) continue
      if (i >= existingPeers && i >= MAX_PEERS_PER_ROOM) break

      try {
        const conn = peerJsRef.current.connect(tryPeerId)
        peerConnections.current.set(tryPeerId, conn)
        setupDataChannelHandlers(conn)

        if (localStream.current) {
          const call = peerJsRef.current.call(tryPeerId, localStream.current)
          if (call) {
            call.on("stream", (remoteStream: MediaStream) => {
              setPeers((prev) => {
                const exists = prev.find((p) => p.id === tryPeerId)
                if (exists) return prev.map((p) => (p.id === tryPeerId ? { ...p, stream: remoteStream } : p))
                return [...prev, { id: tryPeerId, stream: remoteStream }]
              })
            })
          }
        }
      } catch {}
    }
  }, [loadRoomsFromGitHub, setupDataChannelHandlers])

  const joinOrCreateRoom = useCallback(
    async (roomId: string) => {
      const auth = authRef.current
      const userId = auth.user?.id || "anon"
      const rooms = await loadRoomsFromGitHub()
      const roomEntries = typeof rooms === "object" && !Array.isArray(rooms) ? rooms : {}
      const currentCount = roomEntries[roomId] || 0
      if (currentCount >= MAX_PEERS_PER_ROOM) {
        alert("Room is full")
        return
      }
      roomEntries[roomId] = currentCount + 1
      await saveRoomsToGitHub(roomEntries)
      setRoomUsers(Array.from({ length: currentCount + 1 }, (_, i) => i === currentCount ? auth.user?.username || "anon" : `peer-${i}`))

      try {
        const PeerJS = (await import("peerjs")).default
        const peerId = `${roomId}-peer-${currentCount}`
        const peer = new PeerJS(peerId, { debug: 0 })
        peerJsRef.current = peer

        peer.on("open", () => {
          connectToExistingPeers()
        })

        peer.on("call", (call: any) => {
          if (localStream.current) {
            call.answer(localStream.current)
            call.on("stream", (remoteStream: MediaStream) => {
              setPeers((prev) => {
                const exists = prev.find((p) => p.id === call.peer)
                if (exists) return prev.map((p) => (p.id === call.peer ? { ...p, stream: remoteStream } : p))
                return [...prev, { id: call.peer, stream: remoteStream }]
              })
            })
          }
        })

        peer.on("connection", (conn: any) => {
          setupDataChannelHandlers(conn)
        })
      } catch {}
    },
    [loadRoomsFromGitHub, saveRoomsToGitHub, connectToExistingPeers, setupDataChannelHandlers]
  )

  const leaveCall = useCallback(async () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop())
      localStream.current = null
    }
    peerJsRef.current?.destroy()
    peerJsRef.current = null
    peerConnections.current.clear()
    dataChannels.current.clear()
    fileChunksRef.current.clear()
    setPeers([])
    try {
      rtRef.current?.endCall()
    } catch {}
    setRtPeers([])
    setIsInCall(false)
    setIsMuted(false)
    setIsVideoOff(false)

    if (roomIdRef.current) {
      try {
        const rooms = await loadRoomsFromGitHub()
        const roomEntries = typeof rooms === "object" && !Array.isArray(rooms) ? rooms : {}
        const currentCount = roomEntries[roomIdRef.current] || 0
        if (currentCount <= 1) {
          delete roomEntries[roomIdRef.current]
        } else {
          roomEntries[roomIdRef.current] = currentCount - 1
        }
        await saveRoomsToGitHub(roomEntries)
      } catch {}
    }
    roomIdRef.current = ""
    setRoomUsers([])
  }, [loadRoomsFromGitHub, saveRoomsToGitHub])

  const startCall = useCallback(async () => {
    const auth = authRef.current
    if (!auth.isAuthenticated) {
      alert("Sign in to join calls")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStream.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      setIsInCall(true)
      rtRef.current?.startCall(stream).catch(() => {})

      const roomId = await findAvailableRoom()
      roomIdRef.current = roomId
      await joinOrCreateRoom(roomId)
    } catch (err) {
      console.error("Failed to start call:", err)
    }
  }, [findAvailableRoom, joinOrCreateRoom])

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return
    const auth = authRef.current
    const msg: ChatMessage = {
      id: generateId(),
      userId: auth.user?.id || "anon",
      username: auth.user?.username || "Sign in to join",
      avatarUrl: auth.user?.avatarUrl || "",
      content: input,
      timestamp: new Date().toISOString(),
      likes: 0,
      likedBy: [],
    }
    setMessages((prev) => [...prev, msg])
    setInput("")

    try {
      const storage = githubStorage.current
      if (storage) {
        const existing = await storage.getChatMessages()
        const all = Array.isArray(existing) ? [...existing, msg] : [msg]
        await (storage as any).updateFile("chat-messages.json", all.slice(-200), "Update chat messages")
      }
    } catch {}

    try {
      const response = await fetch(
        `${GITHUB_API}/repos/${ECOSYSTEM_DATA_REPO}/contents/community_chat.json`,
        { headers: { Accept: "application/vnd.github.v3+json" } }
      )
      if (response.ok) {
        const data = await response.json()
        if (data.content) {
          const decoded = JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, "")))))
          if (Array.isArray(decoded)) {
            const storage = githubStorage.current
            if (storage) {
              const all = [...decoded, msg].slice(-200)
              await (storage as any).updateFile("community_chat.json", all, "Update community chat")
            }
          }
        }
      }
    } catch {}

    broadcastToPeers({ type: "chat", message: msg })
    try {
      rtRef.current?.sendChat(msg)
    } catch {}
  }, [input, broadcastToPeers])

  const shareFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1]
        const fileId = generateId()
        const chunkSize = 16384
        const totalChunks = Math.ceil(base64.length / chunkSize)

        for (let i = 0; i < totalChunks; i++) {
          const chunk = base64.slice(i * chunkSize, (i + 1) * chunkSize)
          broadcastToPeers({
            type: "file_chunk",
            fileId,
            index: i,
            data: chunk,
            name: file.name,
            mimeType: file.type,
          })
        }
        broadcastToPeers({ type: "file_complete", fileId })

        const auth = authRef.current
        const msg: ChatMessage = {
          id: generateId(),
          userId: auth.user?.id || "anon",
          username: auth.user?.username || "Sign in to join",
          avatarUrl: auth.user?.avatarUrl || "",
          content: `📎 ${file.name}`,
          timestamp: new Date().toISOString(),
          likes: 0,
          likedBy: [],
        }
        setMessages((prev) => [...prev, msg])
      }
      reader.readAsDataURL(file)
    },
    [broadcastToPeers]
  )

  useEffect(() => {
    githubStorage.current = getGitHubStorage()
    authRef.current = getAuthState()
    loadMessages()
    return () => {
      leaveCall()
    }
  }, [loadMessages, leaveCall])

  // Instant website-to-website (and app) transport, added on top of the
  // existing GitHub storage — nothing above is replaced.
  useEffect(() => {
    const auth = getAuthState()
    const rt = new CommunityRealtime(
      {
        userId: auth.user?.id || `guest-${generateId()}`,
        username: auth.user?.username || "guest",
        avatarUrl: auth.user?.avatarUrl || "",
      },
      {
        onChat: (message: ChatMessage) => {
          if (!message?.id) return
          setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
        },
        onPeers: (list) => setRtPeers(list),
      },
    )
    rtRef.current = rt
    rt.connect().catch(() => {})
    return () => {
      rt.disconnect()
      rtRef.current = null
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const interval = setInterval(loadMessages, MESSAGES_POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [loadMessages])

  const renderContent = (content: string) => {
    const imageMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
    if (imageMatch) {
      return <img src={imageMatch[1]} alt="shared" className="max-w-full rounded-lg mt-1" />
    }
    return <span>{content}</span>
  }

  const auth = authRef.current
  const currentUsername = auth.user?.username || ""
  const isOwnMessage = (msg: ChatMessage) => msg.userId === auth.user?.id

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d] bg-[#161b22]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-base">
            💬
          </div>
          <div>
            <h3 className="m-0 text-sm font-semibold text-white">ZYRAXON Community</h3>
            <p className="m-0 text-xs text-[#8b949e]">{messages.length} messages</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { if (isInCall) leaveCall(); else startCall() }}
            className={`px-3.5 py-1.5 rounded-lg border-none cursor-pointer text-xs font-medium text-white transition-colors ${
              isInCall ? "bg-red-600 hover:bg-red-700" : "bg-emerald-500 hover:bg-emerald-600"
            }`}
          >
            {isInCall ? "Leave Call" : auth.isAuthenticated ? "Join Call" : "Sign in to join"}
          </button>
          {isInCall && (
            <>
              <button
                onClick={() => {
                  if (localStream.current) {
                    localStream.current.getAudioTracks().forEach((t) => { t.enabled = isMuted })
                    setIsMuted(!isMuted)
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs text-white ${
                  isMuted ? "bg-red-600 border-red-600" : "bg-[#161b22] border-[#21262d]"
                }`}
              >
                {isMuted ? "🔇" : "🎤"}
              </button>
              <button
                onClick={() => {
                  if (localStream.current) {
                    localStream.current.getVideoTracks().forEach((t) => { t.enabled = isVideoOff })
                    setIsVideoOff(!isVideoOff)
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs text-white ${
                  isVideoOff ? "bg-red-600 border-red-600" : "bg-[#161b22] border-[#21262d]"
                }`}
              >
                {isVideoOff ? "📷" : "📹"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Video Grid */}
      {isInCall && (
        <div className="px-4 py-3 border-b border-[#21262d] bg-[#161b22]">
          <div className="flex gap-3 overflow-x-auto pb-1">
            <div className="relative min-w-[160px] h-[120px] rounded-lg overflow-hidden bg-black border-2 border-indigo-500">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[11px] text-[#8b949e]">You</span>
            </div>
            {peers.map((p) => (
              <div key={p.id} className="relative min-w-[160px] h-[120px] rounded-lg overflow-hidden bg-black border-2 border-[#21262d]">
                <PeerVideo stream={p.stream} />
                <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[11px] text-[#8b949e]">
                  {p.id.split("-").slice(2).join("-") || "peer"}
                </span>
              </div>
            ))}
            {rtPeers.map((p) => (
              <div key={`rt-${p.id}`} className="relative min-w-[160px] h-[120px] rounded-lg overflow-hidden bg-black border-2 border-emerald-500">
                <PeerVideo stream={p.stream} />
                <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[11px] text-[#8b949e]">
                  {p.username || "peer"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auth Gate */}
      {!auth.isAuthenticated && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-[#8b949e] text-sm mb-2">Sign in to join the community chat</p>
            <p className="text-[#484f58] text-xs">Connect your GitHub account to start chatting</p>
          </div>
        </div>
      )}

      {/* Messages */}
      {auth.isAuthenticated && (
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {messages.map((msg) => {
            const own = isOwnMessage(msg)
            return (
              <div key={msg.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%]">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {!own && (
                      <img
                        src={msg.avatarUrl || getAvatarUrl(msg.username)}
                        alt={msg.username}
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                        }}
                      />
                    )}
                    <span className={`text-xs font-medium ${own ? "text-indigo-400" : "text-[#8b949e]"}`}>
                      {msg.username}
                    </span>
                    <span className="text-[11px] text-[#484f58]">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div
                    className={`px-3 py-2 rounded-xl text-sm leading-relaxed break-words ${
                      own
                        ? "bg-gradient-to-br from-indigo-600 to-indigo-500 text-white"
                        : "bg-[#161b22] text-[#c9d1d9]"
                    }`}
                  >
                    {msg.attachment ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span>📎</span>
                          <a
                            href={msg.attachment.url}
                            download={msg.attachment.name}
                            className="text-blue-300 underline"
                          >
                            {msg.attachment.name}
                          </a>
                        </div>
                        {msg.attachment.type?.startsWith("image/") && (
                          <img
                            src={msg.attachment.url}
                            alt={msg.attachment.name}
                            className="max-w-full rounded-md mt-1"
                          />
                        )}
                      </div>
                    ) : (
                      renderContent(msg.content)
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 pl-1">
                    <button
                      onClick={() => {
                        setMessages((prev) =>
                          prev.map((m) => (m.id === msg.id ? { ...m, likes: m.likes + 1 } : m))
                        )
                      }}
                      className="bg-transparent border-none text-[#8b949e] cursor-pointer text-xs py-0.5 px-1 hover:text-red-400 transition-colors"
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
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="border-t border-[#21262d] bg-[#161b22] p-2">
          <div className="flex gap-1 mb-2">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setSelectedEmojiCategory(i)}
                className={`px-2.5 py-1 rounded-md border-none cursor-pointer text-xs transition-colors ${
                  i === selectedEmojiCategory
                    ? "bg-indigo-500 text-white"
                    : "bg-[#161b22] text-[#8b949e] hover:bg-[#21262d]"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
            {EMOJI_CATEGORIES[selectedEmojiCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setInput((prev) => prev + emoji)
                  setShowEmojiPicker(false)
                }}
                className="bg-transparent border-none text-xl cursor-pointer p-1 hover:bg-[#21262d] rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      {auth.isAuthenticated && (
        <div className="px-4 py-3 border-t border-[#21262d] bg-[#161b22]">
          <div className="flex gap-2 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-transparent border-none text-[#8b949e] cursor-pointer text-lg hover:text-[#c9d1d9] transition-colors"
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) shareFile(file)
                e.target.value = ""
              }}
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 rounded-xl border border-[#21262d] bg-[#0d1117] text-white text-sm outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`bg-transparent border-none cursor-pointer text-lg transition-colors ${
                showEmojiPicker ? "text-indigo-500" : "text-[#8b949e] hover:text-[#c9d1d9]"
              }`}
            >
              😊
            </button>
            <button
              onClick={sendMessage}
              className="px-4 py-2 rounded-xl border-none bg-gradient-to-br from-indigo-600 to-indigo-500 text-white cursor-pointer font-medium text-sm hover:from-indigo-500 hover:to-indigo-400 transition-all"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PeerVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
}
