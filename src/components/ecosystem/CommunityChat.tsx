import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type { ChatMessage } from "../../lib/ecosystem"
import { getAuthState } from "../../lib/ecosystem"
import { CommunityRealtime } from "../../lib/community-realtime"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */
const MAX_PEERS_PER_ROOM = 5
const ROOM_PREFIX = "zyraxon-room"
const MESSAGES_POLL_INTERVAL = 8000
const STORE = "/api/public/community-store"

/* ─── Channel definitions ─── */
interface ChannelDef { id: string; name: string; icon: string; description: string }
const CHANNELS: ChannelDef[] = [
  { id: "general", name: "General Chat", icon: "💬", description: "General discussion for all community members" },
  { id: "ai-devs", name: "AI Developers", icon: "🤖", description: "AI development discussions" },
  { id: "plugin-creators", name: "Plugin Creators", icon: "🧩", description: "Plugin creation and sharing" },
  { id: "marketplace-support", name: "Marketplace Support", icon: "🛒", description: "Get help with marketplace issues" },
  { id: "announcements", name: "Announcements", icon: "📢", description: "Official announcements — admin only" },
]

/* ─── Online user type ─── */
interface OnlineUser { id: string; username: string; status: "online" | "away" | "offline"; avatarUrl?: string }

/* ─── Call mode ─── */
type CallMode = null | "video" | "audio" | "voice" | "screen"

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }
function formatTime(ts: string | number) {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return new Date(ts).toLocaleDateString()
}
function getAvatarUrl(username: string) { return `https://github.com/${username}.png` }

/** Detect URLs in text for link preview */
function extractLinks(text: string): string[] {
  const urlRe = /(https?:\/\/[^\s<>"')\]]+)/g
  const matches = text.match(urlRe)
  return matches ? [...new Set(matches)] : []
}

/** File type icon map */
function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (["jpg","jpeg","png","gif","webp","svg","bmp","ico"].includes(ext)) return "🖼️"
  if (["mp4","webm","mov","avi","mkv"].includes(ext)) return "🎬"
  if (["mp3","wav","ogg","flac","aac","m4a"].includes(ext)) return "🎵"
  if (["apk"].includes(ext)) return "📱"
  if (["zip","rar","7z","tar","gz","bz2"].includes(ext)) return "📦"
  if (["pdf"].includes(ext)) return "📄"
  if (["doc","docx"].includes(ext)) return "📝"
  if (["xls","xlsx","csv"].includes(ext)) return "📊"
  if (["js","ts","tsx","jsx","py","java","cpp","go","rs","rb","php"].includes(ext)) return "💻"
  if (["json","yaml","yml","toml","xml"].includes(ext)) return "⚙️"
  return "📎"
}

/** Storage helpers (server-side GitHub) */
async function storeRead<T>(file: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${STORE}?file=${encodeURIComponent(file)}`)
    if (!res.ok) return fallback
    const data = (await res.json()) as { content?: unknown }
    return (data.content ?? fallback) as T
  } catch { return fallback }
}
async function storeWrite(file: string, content: unknown, message: string): Promise<boolean> {
  try {
    const res = await fetch(STORE, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file, content, message }),
    })
    return res.ok
  } catch { return false }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LINK PREVIEW COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
function LinkPreview({ url }: { url: string }) {
  const [meta, setMeta] = useState<{ title: string; description: string; image: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Try to get OG tags from a proxy or just show URL
    const hostname = (() => { try { return new URL(url).hostname } catch { return url } })()
    const pathname = (() => { try { return new URL(url).pathname } catch { return "" } })()
    if (!cancelled) {
      setMeta({
        title: hostname + (pathname.length > 1 ? pathname.slice(0, 40) : ""),
        description: url,
        image: "",
      })
      setLoading(false)
    }
    return () => { cancelled = true }
  }, [url])

  if (loading || !meta) return null

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="block mt-1 mb-1 rounded-lg border border-[#21262d] bg-[#0d1117] hover:border-[#30363d] transition-colors overflow-hidden no-underline"
      style={{ maxWidth: 420 }}
      onClick={e => e.stopPropagation()}>
      <div className="px-3 py-2">
        <div className="text-xs font-semibold text-[#58a6ff] truncate">{meta.title}</div>
        <div className="text-[11px] text-[#8b949e] truncate mt-0.5">{meta.description}</div>
      </div>
    </a>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MESSAGE CONTENT RENDERER
   ═══════════════════════════════════════════════════════════════════════════════ */
function MessageContent({ content, attachment }: { content: string; attachment?: ChatMessage["attachment"] }) {
  const links = useMemo(() => extractLinks(content), [content])
  const imageMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)

  return (
    <div>
      {/* Attachment */}
      {attachment && (
        <div className="mt-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d1117] border border-[#21262d]">
            <span className="text-lg">{getFileIcon(attachment.name)}</span>
            <div className="flex-1 min-w-0">
              <a href={attachment.url} download={attachment.name}
                className="text-sm text-[#58a6ff] hover:underline truncate block">{attachment.name}</a>
              {attachment.type && <span className="text-[10px] text-[#484f58]">{attachment.type}</span>}
            </div>
          </div>
          {attachment.type?.startsWith("image/") && (
            <img src={attachment.url} alt={attachment.name} className="max-w-[360px] max-h-[240px] rounded-lg mt-1 object-cover" />
          )}
          {attachment.type?.startsWith("video/") && (
            <video src={attachment.url} controls className="max-w-[360px] max-h-[240px] rounded-lg mt-1" />
          )}
          {attachment.type?.startsWith("audio/") && (
            <audio src={attachment.url} controls className="mt-1 w-full max-w-[360px]" />
          )}
        </div>
      )}

      {/* Inline image */}
      {imageMatch && !attachment && (
        <img src={imageMatch[1]} alt="shared" className="max-w-[360px] max-h-[240px] rounded-lg mt-1 object-cover" />
      )}

      {/* Text with link previews */}
      <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
      {links.length > 0 && links.map(link => <LinkPreview key={link} url={link} />)}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PEER VIDEO
   ═══════════════════════════════════════════════════════════════════════════════ */
function PeerVideo({ stream, label }: { stream: MediaStream; label: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream])
  return (
    <div className="relative min-w-[180px] h-[120px] rounded-xl overflow-hidden bg-black">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <span className="absolute bottom-1.5 left-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded-md text-[11px] text-[#c9d1d9] font-medium">{label}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function CommunityChat() {
  /* ─── State ─── */
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [activeChannel, setActiveChannel] = useState("general")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [callMode, setCallMode] = useState<CallMode>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [peers, setPeers] = useState<{ id: string; stream: MediaStream }[]>([])
  const [rtPeers, setRtPeers] = useState<{ id: string; username: string; stream: MediaStream }[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [callError, setCallError] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const localStream = useRef<MediaStream | null>(null)
  const screenStream = useRef<MediaStream | null>(null)
  const peerConnections = useRef<Map<string, any>>(new Map())
  const peerJsRef = useRef<any>(null)
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map())
  const fileChunksRef = useRef<Map<string, { data: string[]; name: string; type: string }>>(new Map())
  const roomIdRef = useRef<string>("")
  const rtRef = useRef<CommunityRealtime | null>(null)
  const authRef = useRef(getAuthState())

  const currentChannel = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0]
  const auth = authRef.current

  /* ─── Load messages for active channel ─── */
  const loadMessages = useCallback(async () => {
    try {
      const decoded = await storeRead<ChatMessage[]>(`chat_${activeChannel}.json`, [])
      if (Array.isArray(decoded) && decoded.length > 0) {
        setMessages(decoded.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(-300))
      } else {
        setMessages([])
      }
    } catch {}
  }, [activeChannel])

  useEffect(() => { loadMessages() }, [loadMessages])
  useEffect(() => { const iv = setInterval(loadMessages, MESSAGES_POLL_INTERVAL); return () => clearInterval(iv) }, [loadMessages])

  /* ─── Load online users ─── */
  useEffect(() => {
    const load = async () => {
      try {
        const users = await storeRead<OnlineUser[]>("online_users.json", [])
        setOnlineUsers(Array.isArray(users) ? users : [])
      } catch {}
    }
    load()
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [])

  /* ─── Scroll to bottom ─── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  /* ─── Realtime ─── */
  useEffect(() => {
    const user = auth.user
    if (!user) return
    rtRef.current = new CommunityRealtime(
      { userId: user.id, username: user.username, avatarUrl: user.avatarUrl || "" },
      {
        onChat: (msg: any) => {
          if (!msg?.id) return
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        },
        onPeers: (list) => setRtPeers(list),
      }
    )
    rtRef.current.connect().catch(() => {})

    // Announce online
    const announce = async () => {
      const existing = await storeRead<OnlineUser[]>("online_users.json", [])
      const withoutMe = (Array.isArray(existing) ? existing : []).filter(u => u.id !== user.id)
      await storeWrite("online_users.json", [...withoutMe, { id: user.id, username: user.username, status: "online", avatarUrl: user.avatarUrl }], "User online")
    }
    announce()

    return () => { rtRef.current?.disconnect(); rtRef.current = null }
  }, [auth.user?.id])

  /* ─── Load GitHub storage ref ─── */
  useEffect(() => {
    authRef.current = getAuthState()
    return () => { leaveCall() }
  }, [])

  /* ═══════════════════════════════════════════════════════════════════════════════
     SEND MESSAGE
     ═══════════════════════════════════════════════════════════════════════════════ */
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !auth.user) return
    setSending(true)
    const msg: ChatMessage = {
      id: `msg-${generateId()}`, userId: auth.user.id, username: auth.user.username,
      avatarUrl: auth.user.avatarUrl || "", content: input,
      timestamp: new Date().toISOString(), likes: 0, likedBy: [],
    }
    setMessages(prev => [...prev, msg])
    setInput("")
    setShowEmojiPicker(false)
    rtRef.current?.sendChat(msg)
    dataChannels.current.forEach(dc => { try { dc.send(JSON.stringify({ type: "chat", message: msg })) } catch {} })
    try {
      const existing = await storeRead<ChatMessage[]>(`chat_${activeChannel}.json`, [])
      const all = [...(Array.isArray(existing) ? existing : []), msg].slice(-300)
      await storeWrite(`chat_${activeChannel}.json`, all, `Chat: ${msg.username}`)
    } catch {}
    setSending(false)
  }, [input, auth.user, activeChannel])

  /* ═══════════════════════════════════════════════════════════════════════════════
     FILE UPLOAD (supports ALL file types including APK)
     ═══════════════════════════════════════════════════════════════════════════════ */
  const handleFileUpload = useCallback(async (file: File) => {
    if (!auth.user) return
    setUploadingFile(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(",")[1]
      const fileId = `file-${generateId()}`

      // Chunk and send via data channels + realtime
      const chunkSize = 16384
      const totalChunks = Math.ceil(base64.length / chunkSize)
      for (let i = 0; i < totalChunks; i++) {
        const chunk = base64.slice(i * chunkSize, (i + 1) * chunkSize)
        const payload = { type: "file_chunk", fileId, index: i, data: chunk, name: file.name, mimeType: file.type }
        rtRef.current?.sendChat(payload as any)
        dataChannels.current.forEach(dc => { try { dc.send(JSON.stringify(payload)) } catch {} })
      }
      const complete = { type: "file_complete", fileId, fileName: file.name, mimeType: file.type }
      rtRef.current?.sendChat(complete as any)
      dataChannels.current.forEach(dc => { try { dc.send(JSON.stringify(complete)) } catch {} })

      // File message with attachment
      const attachmentUrl = dataUrl
      const fileMsg: ChatMessage = {
        id: `msg-${generateId()}`, userId: auth.user!.id, username: auth.user!.username,
        avatarUrl: auth.user!.avatarUrl || "",
        content: `Shared ${getFileIcon(file.name)} ${file.name}`,
        timestamp: new Date().toISOString(), likes: 0, likedBy: [],
        attachment: { name: file.name, url: attachmentUrl, type: file.type || "application/octet-stream" },
      }
      setMessages(prev => [...prev, fileMsg])
      try {
        const existing = await storeRead<ChatMessage[]>(`chat_${activeChannel}.json`, [])
        const all = [...(Array.isArray(existing) ? existing : []), fileMsg].slice(-300)
        await storeWrite(`chat_${activeChannel}.json`, all, `File: ${file.name}`)
      } catch {}
      setUploadingFile(false)
    }
    reader.readAsDataURL(file)
  }, [auth.user, activeChannel])

  /* ═══════════════════════════════════════════════════════════════════════════════
     CALL SYSTEM — 4 modes: video, audio, voice (PTT), screen
     ═══════════════════════════════════════════════════════════════════════════════ */
  const loadRoomsFromGitHub = useCallback(async (): Promise<Record<string, number>> => {
    try {
      const rooms = await storeRead<Record<string, number>>("active_rooms.json", {})
      return (rooms && typeof rooms === "object" && !Array.isArray(rooms)) ? rooms : {}
    } catch { return {} }
  }, [])

  const saveRoomsToGitHub = useCallback(async (rooms: Record<string, number>) => {
    try { await storeWrite("active_rooms.json", rooms, "Update rooms") } catch {}
  }, [])

  const findAvailableRoom = useCallback(async (): Promise<string> => {
    const rooms = await loadRoomsFromGitHub()
    for (let i = 0; i < 1000; i++) {
      const id = `${ROOM_PREFIX}-${i}`
      if ((rooms[id] || 0) < MAX_PEERS_PER_ROOM) return id
    }
    return `${ROOM_PREFIX}-${Date.now()}`
  }, [loadRoomsFromGitHub])

  const broadcastToPeers = useCallback((data: any) => {
    const json = JSON.stringify(data)
    dataChannels.current.forEach(ch => { if (ch.readyState === "open") ch.send(json) })
  }, [])

  const setupDataChannelHandlers = useCallback((conn: any) => {
    conn.on("open", () => { dataChannels.current.set(conn.peer, conn) })
    conn.on("data", (data: any) => {
      if (typeof data !== "string") return
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === "chat") {
          setMessages(prev => prev.find(m => m.id === parsed.message.id) ? prev : [...prev, parsed.message])
        } else if (parsed.type === "file_chunk") {
          const { fileId, index, data: d, name, mimeType } = parsed
          if (!fileChunksRef.current.has(fileId)) fileChunksRef.current.set(fileId, { data: [], name, type: mimeType })
          fileChunksRef.current.get(fileId)!.data[index] = d
        } else if (parsed.type === "file_complete") {
          const file = fileChunksRef.current.get(parsed.fileId)
          if (file) {
            const fileMsg: ChatMessage = {
              id: `msg-${generateId()}`, userId: "peer", username: "Peer",
              avatarUrl: "", content: `📎 ${file.name}`,
              timestamp: new Date().toISOString(), likes: 0, likedBy: [],
              attachment: { name: file.name, url: `data:${file.type};base64,${file.data.join("")}`, type: file.type },
            }
            setMessages(prev => [...prev, fileMsg])
            fileChunksRef.current.delete(parsed.fileId)
          }
        }
      } catch {}
    })
    conn.on("close", () => {
      dataChannels.current.delete(conn.peer)
      peerConnections.current.delete(conn.peer)
      setPeers(prev => prev.filter(p => p.id !== conn.peer))
    })
  }, [])

  const connectToExistingPeers = useCallback(async () => {
    const rooms = await loadRoomsFromGitHub()
    const count = rooms[roomIdRef.current] || 0
    const myId = peerJsRef.current?.id
    if (!myId) return
    for (let i = 0; i < count; i++) {
      const peerId = `${roomIdRef.current}-peer-${i}`
      if (peerId === myId || peerConnections.current.has(peerId)) continue
      try {
        const conn = peerJsRef.current.connect(peerId)
        peerConnections.current.set(peerId, conn)
        setupDataChannelHandlers(conn)
        if (localStream.current) {
          const call = peerJsRef.current.call(peerId, localStream.current)
          if (call) {
            call.on("stream", (remoteStream: MediaStream) => {
              setPeers(prev => {
                const exists = prev.find(p => p.id === peerId)
                if (exists) return prev.map(p => p.id === peerId ? { ...p, stream: remoteStream } : p)
                return [...prev, { id: peerId, stream: remoteStream }]
              })
            })
          }
        }
      } catch {}
    }
  }, [loadRoomsFromGitHub, setupDataChannelHandlers])

  const joinOrCreateRoom = useCallback(async (roomId: string) => {
    const rooms = await loadRoomsFromGitHub()
    const count = rooms[roomId] || 0
    if (count >= MAX_PEERS_PER_ROOM) { alert("Room is full (max 5)"); return }
    rooms[roomId] = count + 1
    await saveRoomsToGitHub(rooms)
    try {
      const PeerJS = (await import("peerjs")).default
      const peer = new PeerJS(`${roomId}-peer-${count}`, { debug: 0 })
      peerJsRef.current = peer
      peer.on("open", () => connectToExistingPeers())
      peer.on("call", (call: any) => {
        if (localStream.current) {
          call.answer(localStream.current)
          call.on("stream", (remoteStream: MediaStream) => {
            setPeers(prev => {
              const exists = prev.find(p => p.id === call.peer)
              if (exists) return prev.map(p => p.id === call.peer ? { ...p, stream: remoteStream } : p)
              return [...prev, { id: call.peer, stream: remoteStream }]
            })
          })
        }
      })
      peer.on("connection", (conn: any) => setupDataChannelHandlers(conn))
    } catch {}
  }, [loadRoomsFromGitHub, saveRoomsToGitHub, connectToExistingPeers, setupDataChannelHandlers])

  const leaveCall = useCallback(async () => {
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    screenStream.current?.getTracks().forEach(t => t.stop())
    screenStream.current = null
    peerJsRef.current?.destroy()
    peerJsRef.current = null
    peerConnections.current.clear()
    dataChannels.current.clear()
    fileChunksRef.current.clear()
    setPeers([])
    setRtPeers([])
    try { rtRef.current?.endCall() } catch {}
    setCallMode(null)
    setIsMuted(false)
    setIsVideoOff(false)
    setCallError("")
    if (roomIdRef.current) {
      try {
        const rooms = await loadRoomsFromGitHub()
        const c = rooms[roomIdRef.current] || 0
        if (c <= 1) delete rooms[roomIdRef.current]
        else rooms[roomIdRef.current] = c - 1
        await saveRoomsToGitHub(rooms)
      } catch {}
    }
    roomIdRef.current = ""
  }, [loadRoomsFromGitHub, saveRoomsToGitHub])

  /** Start a call with the given mode */
  const startCall = useCallback(async (mode: CallMode) => {
    if (!auth.user) { alert("Sign in to join calls"); return }
    if (callMode) { await leaveCall() }
    setCallError("")

    try {
      if (mode === "video" || mode === "audio") {
        const stream = await navigator.mediaDevices.getUserMedia({ video: mode === "video", audio: true })
        localStream.current = stream
        if (mode === "video" && localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.play().catch(() => {})
        }
      } else if (mode === "voice") {
        // Voice/PTT mode — audio only, no video
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        localStream.current = stream
      } else if (mode === "screen") {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        screenStream.current = stream
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream
          screenVideoRef.current.play().catch(() => {})
        }
        stream.getVideoTracks()[0].onended = () => { leaveCall() }
        // Also get audio for screen share
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
          localStream.current = audioStream
        } catch { /* audio optional for screen share */ }
      }

      setCallMode(mode)
      rtRef.current?.startCall(localStream.current || screenStream.current!).catch(() => {})
      const roomId = await findAvailableRoom()
      roomIdRef.current = roomId
      await joinOrCreateRoom(roomId)
    } catch (err: any) {
      setCallError(err?.message || "Failed to start call")
      setCallMode(null)
    }
  }, [auth.user, callMode, leaveCall, findAvailableRoom, joinOrCreateRoom])

  const toggleMute = useCallback(() => {
    const stream = localStream.current
    if (!stream) return
    const track = stream.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled) }
  }, [])

  const toggleVideo = useCallback(() => {
    const stream = localStream.current
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled) }
  }, [])

  /* ═══════════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full bg-[#0d1117] text-[#c9d1d9] overflow-hidden">

      {/* ═══ LEFT SIDEBAR ═══ */}
      <div className="w-[260px] min-w-[260px] bg-[#161b22] border-r border-[#21262d] flex flex-col overflow-hidden max-md:hidden">
        {/* Community header */}
        <div className="px-3.5 py-3.5 border-b border-[#21262d]" style={{ background: "linear-gradient(135deg, rgba(31,111,235,0.1), rgba(137,87,229,0.08))" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#1f6feb] to-[#8957e5] flex items-center justify-center text-base">🌐</div>
            <div>
              <div className="font-bold text-sm text-[#e6edf3]">ZYRAXON Community</div>
              <div className="text-[11px] text-[#8b949e]">128 members · {onlineUsers.filter(u => u.status === "online").length || 45} online</div>
            </div>
          </div>
        </div>

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {/* Channels */}
          <div className="px-3.5 pb-1 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">Community</div>
          {CHANNELS.map(ch => (
            <button key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`flex items-center gap-2 w-full px-3.5 py-[7px] border-none cursor-pointer text-left text-[13px] transition-all rounded-none ${
                activeChannel === ch.id
                  ? "bg-[rgba(88,166,255,0.12)] text-[#58a6ff]"
                  : "bg-transparent text-[#8b949e] hover:bg-[rgba(88,166,255,0.06)]"
              }`}>
              <span className="text-[15px]">{ch.icon}</span>
              <span>{ch.name}</span>
            </button>
          ))}

          {/* Voice Channels */}
          <div className="px-3.5 pt-4 pb-1 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">Voice Channels</div>
          <div className="px-3.5 py-2">
            <div className="rounded-lg border border-[#21262d] bg-[#0d1117] p-2.5">
              <div className="text-[12px] text-[#8b949e] mb-2 font-medium">🔊 General Voice</div>
              {callMode && (
                <div className="flex items-center gap-2 py-1">
                  <div className="w-7 h-7 rounded-full bg-[#21262d] flex items-center justify-center text-[11px]">
                    {auth.user?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-[12px] text-[#c9d1d9]">{auth.user?.username || "You"}</span>
                  <div className="ml-auto flex gap-1">
                    {isMuted && <span className="text-[10px] text-[#f85149]">🔇</span>}
                  </div>
                </div>
              )}
              {peers.length > 0 && peers.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1">
                  <div className="w-7 h-7 rounded-full bg-[#21262d] flex items-center justify-center text-[11px] text-[#8b949e]">P</div>
                  <span className="text-[12px] text-[#c9d1d9]">peer-{p.id.split("-").slice(-1)[0]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div className="px-3.5 pt-3 pb-1 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center justify-between">
            <span>Direct Messages</span>
            <span className="text-[14px] cursor-pointer hover:text-[#c9d1d9]">+</span>
          </div>
          {onlineUsers.slice(0, 8).map(user => (
            <div key={user.id}
              className="flex items-center gap-2 px-3.5 py-[5px] cursor-pointer text-[13px] hover:bg-[rgba(88,166,255,0.06)] transition-colors">
              <div className="relative">
                <img src={user.avatarUrl || getAvatarUrl(user.username)} alt=""
                  className="w-7 h-7 rounded-full bg-[#21262d]"
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.username}&background=1f6feb&color=fff&size=56` }} />
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#161b22] ${
                  user.status === "online" ? "bg-[#3fb950]" : user.status === "away" ? "bg-[#d29922]" : "bg-[#484f58]"
                }`} />
              </div>
              <span className="text-[#c9d1d9]">{user.username}</span>
            </div>
          ))}
        </div>

        {/* Bottom: call controls */}
        <div className="border-t border-[#21262d] p-3">
          <div className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-2">Call Controls</div>
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => callMode === "video" ? leaveCall() : startCall("video")}
              title="Video Call"
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border-none cursor-pointer text-[18px] transition-all ${
                callMode === "video" ? "bg-[#3fb950] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]"
              }`}>
              <span>📹</span>
              <span className="text-[9px] font-medium">Video</span>
            </button>
            <button onClick={() => callMode === "audio" ? leaveCall() : startCall("audio")}
              title="Audio Call (mic + speaker)"
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border-none cursor-pointer text-[18px] transition-all ${
                callMode === "audio" ? "bg-[#3fb950] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]"
              }`}>
              <span>🎧</span>
              <span className="text-[9px] font-medium">Audio</span>
            </button>
            <button onClick={() => callMode === "voice" ? leaveCall() : startCall("voice")}
              title="Voice Call (PTT-style)"
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border-none cursor-pointer text-[18px] transition-all ${
                callMode === "voice" ? "bg-[#f85149] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]"
              }`}>
              <span>🎤</span>
              <span className="text-[9px] font-medium">Voice</span>
            </button>
            <button onClick={() => callMode === "screen" ? leaveCall() : startCall("screen")}
              title="Screen Share"
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border-none cursor-pointer text-[18px] transition-all ${
                callMode === "screen" ? "bg-[#8957e5] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]"
              }`}>
              <span>🖥️</span>
              <span className="text-[9px] font-medium">Screen</span>
            </button>
          </div>
          {callMode && (
            <div className="flex gap-1.5 mt-2">
              <button onClick={toggleMute}
                className={`flex-1 py-1.5 rounded-lg border-none cursor-pointer text-[12px] font-medium transition-all ${
                  isMuted ? "bg-[#f85149] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]"
                }`}>
                {isMuted ? "🔇 Unmute" : "🎙️ Mute"}
              </button>
              {(callMode === "video" || callMode === "audio") && (
                <button onClick={toggleVideo}
                  className={`flex-1 py-1.5 rounded-lg border-none cursor-pointer text-[12px] font-medium transition-all ${
                    isVideoOff ? "bg-[#f85149] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]"
                  }`}>
                  {isVideoOff ? "📷 Cam On" : "📹 Cam Off"}
                </button>
              )}
              <button onClick={leaveCall}
                className="flex-1 py-1.5 rounded-lg border-none cursor-pointer text-[12px] font-medium bg-[#f85149] text-white hover:bg-[#da3633] transition-all">
                Leave
              </button>
            </div>
          )}
          <div className="mt-2 text-center text-[11px] text-[#484f58]">
            {callMode ? `🔴 ${callMode.toUpperCase()} · ${peers.length + 1}/${MAX_PEERS_PER_ROOM}` : "No active call"}
          </div>
        </div>
      </div>

      {/* ═══ MAIN CHAT ═══ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ─── Top bar ─── */}
        <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#21262d] flex items-center gap-3">
          <span className="text-lg">{currentChannel.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px] text-[#e6edf3]"># {currentChannel.name}</div>
            <div className="text-[11px] text-[#8b949e]">{currentChannel.description}</div>
          </div>
          {callMode && (
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                callMode === "video" ? "bg-[#3fb950] text-white" :
                callMode === "audio" ? "bg-[#3fb950] text-white" :
                callMode === "voice" ? "bg-[#f85149] text-white" :
                "bg-[#8957e5] text-white"
              }`}>
                {callMode === "video" ? "📹" : callMode === "audio" ? "🎧" : callMode === "voice" ? "🎤" : "🖥️"}
                {" "}{callMode} · {peers.length + 1} connected
              </span>
            </div>
          )}
        </div>

        {/* ─── Call error ─── */}
        {callError && (
          <div className="px-4 py-2 bg-[#f8514915] border-b border-[#f8514933] text-[12px] text-[#f85149]">{callError}</div>
        )}

        {/* ─── Call video grid ─── */}
        {callMode && (callMode === "video" || callMode === "screen") && (
          <div className="px-4 py-3 bg-[#0d1117] border-b border-[#21262d]">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {callMode === "screen" && screenStream.current && (
                <div className="relative min-w-[280px] h-[160px] rounded-xl overflow-hidden bg-black border-2 border-[#8957e5]">
                  <video ref={screenVideoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                  <span className="absolute bottom-1.5 left-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded-md text-[11px] text-[#c9d1d9]">🖥️ Screen Share</span>
                </div>
              )}
              {callMode === "video" && (
                <div className="relative min-w-[180px] h-[120px] rounded-xl overflow-hidden bg-black border-2 border-[#1f6feb]">
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  <span className="absolute bottom-1.5 left-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded-md text-[11px] text-[#c9d1d9]">You {isMuted ? "(Muted)" : ""}</span>
                  {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#21262d]">
                      <div className="w-12 h-12 rounded-full bg-[#30363d] flex items-center justify-center text-xl text-[#8b949e]">
                        {(auth.user?.username || "?")[0].toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {peers.map(p => (
                <PeerVideo key={p.id} stream={p.stream} label={`peer-${p.id.split("-").slice(-1)[0]}`} />
              ))}
              {rtPeers.map(p => (
                <PeerVideo key={`rt-${p.id}`} stream={p.stream} label={p.username || "peer"} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Auth gate ─── */}
        {!auth.isAuthenticated && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="text-5xl mb-4">🔒</div>
              <p className="text-[#8b949e] text-sm mb-2">Sign in to join the community chat</p>
              <p className="text-[#484f58] text-xs">Connect your GitHub account to start chatting</p>
            </div>
          </div>
        )}

        {/* ─── Messages ─── */}
        {auth.isAuthenticated && (
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-3">{currentChannel.icon}</div>
                <div className="text-lg font-bold text-[#e6edf3] mb-1">Welcome to #{currentChannel.name}!</div>
                <div className="text-[13px] text-[#8b949e]">This is the start of the conversation.</div>
              </div>
            )}
            {messages.map((msg, i) => {
              const own = msg.userId === auth.user?.id
              const showAvatar = i === 0 || messages[i - 1]?.userId !== msg.userId
              return (
                <div key={msg.id}
                  className={`flex gap-2.5 py-0.5 group ${own ? "flex-row-reverse" : ""} ${showAvatar ? "mt-2" : ""}`}>
                  {/* Avatar */}
                  {showAvatar ? (
                    <img src={msg.avatarUrl || getAvatarUrl(msg.username)} alt=""
                      className="w-9 h-9 rounded-full bg-[#21262d] flex-shrink-0 mt-0.5 object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${msg.username}&background=1f6feb&color=fff&size=72` }} />
                  ) : <div className="w-9 flex-shrink-0" />}

                  {/* Bubble */}
                  <div className={`max-w-[70%] min-w-0 ${own ? "text-right" : ""}`}>
                    {showAvatar && (
                      <div className={`flex items-baseline gap-2 mb-0.5 ${own ? "justify-end" : ""}`}>
                        <span className={`text-[13px] font-semibold ${msg.username === "ZYRAXON" ? "text-[#58a6ff]" : own ? "text-[#a371f7]" : "text-[#e6edf3]"}`}>
                          {msg.username}
                        </span>
                        <span className="text-[10px] text-[#484f58]">{formatTime(msg.timestamp)}</span>
                      </div>
                    )}
                    <div className={`px-3.5 py-2 rounded-2xl text-[13.5px] leading-relaxed break-words inline-block text-left ${
                      own
                        ? "bg-gradient-to-br from-[#1f6feb] to-[#1a60d4] text-white rounded-br-md"
                        : "bg-[#161b22] text-[#c9d1d9] border border-[#21262d] rounded-bl-md"
                    }`}>
                      <MessageContent content={msg.content} attachment={msg.attachment} />
                    </div>
                    {msg.likes > 0 && (
                      <div className={`text-[10px] text-[#484f58] mt-0.5 ${own ? "text-right" : "text-left"}`}>
                        ❤️ {msg.likes}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* ─── Input area ─── */}
        {auth.isAuthenticated && (
          <div className="px-4 py-3 bg-[#161b22] border-t border-[#21262d]">
            {/* Emoji picker (emoji-mart) */}
            {showEmojiPicker && (
              <div className="mb-2 rounded-xl overflow-hidden border border-[#21262d]">
                <Picker
                  data={data}
                  onEmojiSelect={(emoji: any) => { setInput(prev => prev + emoji.native); setShowEmojiPicker(false) }}
                  theme="dark"
                  previewPosition="none"
                  skinTonePosition="search"
                  maxFrequentRows={2}
                  perLine={9}
                />
              </div>
            )}

            <div className="flex gap-2 items-center">
              {/* File upload button */}
              <input ref={fileInputRef} type="file" className="hidden"
                accept="*/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = "" }} />
              <button onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                title="Share any file (APK, images, videos, documents...)"
                className="p-2 rounded-lg border border-[#21262d] bg-[#0d1117] text-[#8b949e] cursor-pointer text-lg hover:border-[#30363d] hover:text-[#c9d1d9] transition-all disabled:opacity-50">
                {uploadingFile ? "⏳" : "📎"}
              </button>

              {/* Emoji button */}
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-lg border border-[#21262d] bg-[#0d1117] cursor-pointer text-lg transition-all ${
                  showEmojiPicker ? "text-[#58a6ff] border-[#58a6ff]" : "text-[#8b949e] hover:text-[#c9d1d9] hover:border-[#30363d]"
                }`}>
                😊
              </button>

              {/* Text input */}
              <input type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={`Message #${currentChannel.name}`}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#21262d] bg-[#0d1117] text-[#c9d1d9] text-[13.5px] outline-none focus:border-[#58a6ff] transition-colors"
                disabled={sending} />

              {/* Send button */}
              <button onClick={sendMessage} disabled={!input.trim() || sending}
                className={`px-5 py-2.5 rounded-xl border-none cursor-pointer text-[13px] font-semibold transition-all ${
                  input.trim()
                    ? "bg-gradient-to-br from-[#238636] to-[#2ea043] text-white hover:from-[#2ea043] hover:to-[#3fb950]"
                    : "bg-[#21262d] text-[#484f58] cursor-not-allowed"
                }`}>
                {sending ? "..." : "➤"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ RIGHT SIDEBAR (Online Members) ═══ */}
      <div className="w-[220px] bg-[#161b22] border-l border-[#21262d] flex-col overflow-hidden max-lg:hidden flex">
        <div className="px-3.5 py-3 border-b border-[#21262d] text-[12px] font-bold text-[#8b949e] uppercase">
          Online — {onlineUsers.filter(u => u.status === "online").length || 1}
        </div>
        <div className="flex-1 overflow-y-auto py-1.5">
          {/* Current user */}
          {auth.user && (
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-[rgba(88,166,255,0.06)] transition-colors">
              <div className="relative">
                <img src={auth.user.avatarUrl || getAvatarUrl(auth.user.username)} alt=""
                  className="w-8 h-8 rounded-full bg-[#21262d]"
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${auth.user?.username}&background=8957e5&color=fff&size=64` }} />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#3fb950] border-2 border-[#161b22]" />
              </div>
              <div>
                <div className="text-[13px] text-[#e6edf3] font-medium">{auth.user.username}</div>
                <div className="text-[10px] text-[#3fb950]">online · you</div>
              </div>
            </div>
          )}
          {onlineUsers.filter(u => u.id !== auth.user?.id).map(user => (
            <div key={user.id}
              className="flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-[rgba(88,166,255,0.06)] transition-colors cursor-pointer">
              <div className="relative">
                <img src={user.avatarUrl || getAvatarUrl(user.username)} alt=""
                  className="w-8 h-8 rounded-full bg-[#21262d]"
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.username}&background=1f6feb&color=fff&size=64` }} />
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#161b22] ${
                  user.status === "online" ? "bg-[#3fb950]" : user.status === "away" ? "bg-[#d29922]" : "bg-[#484f58]"
                }`} />
              </div>
              <div>
                <div className="text-[13px] text-[#c9d1d9]">{user.username}</div>
                <div className="text-[10px] text-[#484f58]">{user.status}</div>
              </div>
            </div>
          ))}
          {onlineUsers.length === 0 && !auth.user && (
            <div className="px-3.5 py-4 text-center text-[12px] text-[#484f58]">Sign in to see who's online</div>
          )}
        </div>
      </div>
    </div>
  )
}
