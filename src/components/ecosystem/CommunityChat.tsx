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

/* ─── SVG Icons ─── */
const SvgHash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
const SvgRobot = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M12 11V7"/><path d="M9 7h6"/><line x1="12" y1="4" x2="12" y2="7"/></svg>
const SvgPuzzle = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 01-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 10-3.214 3.214c.446.166.855.497.925.968a.979.979 0 01-.276.837l-1.61 1.611a2.404 2.404 0 01-1.705.707 2.402 2.402 0 01-1.704-.706l-1.568-1.568a1.026 1.026 0 00-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 11-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 00-.289-.877l-1.568-1.568A2.402 2.402 0 011.998 12c0-.617.236-1.234.706-1.704L4.315 8.685a.98.98 0 01.837-.276c.47.07.802.48.968.925a2.501 2.501 0 103.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 01.276-.837l1.61-1.611A2.404 2.404 0 0112 2c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 113.237 3.237c-.464.18-.894.527-.967 1.02z"/></svg>
const SvgCart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
const SvgMegaphone = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>
const SvgGlobe = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
const SvgVideo = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
const SvgHeadphones = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>
const SvgMic = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="1" width="6" height="11" rx="3"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const SvgScreen = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
const SvgPaperclip = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
const SvgSend = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
const SvgSmile = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
const SvgX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const SvgMute = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .55-.06 1.08-.17 1.58"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const SvgHeart = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
const SvgPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const SvgVolume = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>

const CHANNEL_ICON_MAP: Record<string, () => React.ReactElement> = {
  "general": SvgHash,
  "ai-devs": SvgRobot,
  "plugin-creators": SvgPuzzle,
  "marketplace-support": SvgCart,
  "announcements": SvgMegaphone,
}

/* ─── Channel definitions ─── */
interface ChannelDef { id: string; name: string; description: string }
const CHANNELS: ChannelDef[] = [
  { id: "general", name: "General Chat", description: "General discussion for all community members" },
  { id: "ai-devs", name: "AI Developers", description: "AI development discussions" },
  { id: "plugin-creators", name: "Plugin Creators", description: "Plugin creation and sharing" },
  { id: "marketplace-support", name: "Marketplace Support", description: "Get help with marketplace issues" },
  { id: "announcements", name: "Announcements", description: "Official announcements" },
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

/* ─── File type icon map ─── */
function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  if (["jpg","jpeg","png","gif","webp","svg","bmp","ico"].includes(ext)) return "IMG"
  if (["mp4","webm","mov","avi","mkv"].includes(ext)) return "VID"
  if (["mp3","wav","ogg","flac","aac","m4a"].includes(ext)) return "AUD"
  if (["apk"].includes(ext)) return "APK"
  if (["zip","rar","7z","tar","gz","bz2"].includes(ext)) return "ZIP"
  if (["pdf"].includes(ext)) return "PDF"
  if (["doc","docx"].includes(ext)) return "DOC"
  if (["xls","xlsx","csv"].includes(ext)) return "XLS"
  if (["js","ts","tsx","jsx","py","java","cpp","go","rs","rb","php"].includes(ext)) return "SRC"
  if (["json","yaml","yml","toml","xml"].includes(ext)) return "CFG"
  return "FILE"
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
  const [showOnlinePanel, setShowOnlinePanel] = useState(true)

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
  /** Messages added locally that may not be on GitHub yet — prevents poll from dropping them */
  const pendingLocalMsgsRef = useRef<Map<string, ChatMessage>>(new Map())

  const currentChannel = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0]
  const auth = authRef.current

  /* ─── Load messages for active channel ─── */
  const lastChannelRef = useRef(activeChannel)
  const loadMessages = useCallback(async () => {
    try {
      const decoded = await storeRead<ChatMessage[]>(`chat_${activeChannel}.json`, [])
      let serverMsgs = (Array.isArray(decoded) && decoded.length > 0)
        ? decoded.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(-300)
        : []
      // Load file attachments from separate files
      serverMsgs = await Promise.all(serverMsgs.map(async (msg) => {
        if (msg.attachment?.fileId && !msg.attachment.url) {
          try {
            const fileData = await storeRead<{ name: string; type: string; data: string }>(
              `chat_files/${activeChannel}/${msg.attachment.fileId}.json`, null as any
            )
            if (fileData?.data) {
              return { ...msg, attachment: { ...msg.attachment, url: `data:${fileData.type};base64,${fileData.data}` } }
            }
          } catch {}
        }
        return msg
      }))
      // If channel changed, replace entirely. Otherwise merge: keep local + add new server
      if (lastChannelRef.current !== activeChannel) {
        lastChannelRef.current = activeChannel
        pendingLocalMsgsRef.current.clear()
        setMessages(serverMsgs)
      } else {
        setMessages(prev => {
          const serverIds = new Set(serverMsgs.map(m => m.id))
          const pendingOnly = prev.filter(m => !serverIds.has(m.id))
          const merged = new Map<string, ChatMessage>()
          for (const m of [...pendingOnly, ...serverMsgs]) merged.set(m.id, m)
          return Array.from(merged.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        })
        for (const m of serverMsgs) pendingLocalMsgsRef.current.delete(m.id)
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
    pendingLocalMsgsRef.current.set(msg.id, msg)
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

      // Store file data in separate GitHub file (keeps chat JSON small)
      try {
        await storeWrite(`chat_files/${activeChannel}/${fileId}.json`, {
          name: file.name, type: file.type, data: base64
        }, `File upload: ${file.name}`)
      } catch {}

      // File message with reference to separate file
      const fileMsg: ChatMessage = {
        id: `msg-${generateId()}`, userId: auth.user!.id, username: auth.user!.username,
        avatarUrl: auth.user!.avatarUrl || "",
        content: `Shared ${getFileIcon(file.name)} ${file.name}`,
        timestamp: new Date().toISOString(), likes: 0, likedBy: [],
        attachment: { name: file.name, type: file.type || "application/octet-stream", fileId },
      }
      setMessages(prev => [...prev, fileMsg])
      pendingLocalMsgsRef.current.set(fileMsg.id, fileMsg)
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
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#1f6feb] to-[#8957e5] flex items-center justify-center text-white"><SvgGlobe /></div>
            <div>
              <div className="font-bold text-sm text-[#e6edf3]">ZYRAXON Community</div>
              <div className="text-[11px] text-[#8b949e]">{onlineUsers.length || (auth.user ? 1 : 0)} online</div>
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
              <span className="text-[15px] flex-shrink-0">{(() => { const Icon = CHANNEL_ICON_MAP[ch.id]; return Icon ? <Icon /> : <SvgHash />; })()}</span>
              <span>{ch.name}</span>
            </button>
          ))}

          {/* Voice Channels */}
          <div className="px-3.5 pt-4 pb-1 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">Voice Channels</div>
          <div className="px-3.5 py-2">
            <div className="rounded-lg border border-[#21262d] bg-[#0d1117] p-2.5">
              <div className="text-[12px] text-[#8b949e] mb-2 font-medium flex items-center gap-1.5"><SvgVolume /> General Voice</div>
              {callMode && (
                <div className="flex items-center gap-2 py-1">
                  <div className="w-7 h-7 rounded-full bg-[#21262d] flex items-center justify-center text-[11px]">
                    {auth.user?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-[12px] text-[#c9d1d9]">{auth.user?.username || "You"}</span>
                  <div className="ml-auto flex gap-1">
                    {isMuted && <span className="text-[#f85149]"><SvgMute /></span>}
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
            <span className="cursor-pointer hover:text-[#c9d1d9]"><SvgPlus /></span>
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
              <SvgVideo />
              <span className="text-[9px] font-medium">Video</span>
            </button>
            <button onClick={() => callMode === "audio" ? leaveCall() : startCall("audio")}
              title="Audio Call (mic + speaker)"
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border-none cursor-pointer text-[18px] transition-all ${
                callMode === "audio" ? "bg-[#3fb950] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]"
              }`}>
              <SvgHeadphones />
              <span className="text-[9px] font-medium">Audio</span>
            </button>
            <button onClick={() => callMode === "voice" ? leaveCall() : startCall("voice")}
              title="Voice Call (PTT-style)"
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border-none cursor-pointer text-[18px] transition-all ${
                callMode === "voice" ? "bg-[#f85149] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]"
              }`}>
              <SvgMic />
              <span className="text-[9px] font-medium">Voice</span>
            </button>
            <button onClick={() => callMode === "screen" ? leaveCall() : startCall("screen")}
              title="Screen Share"
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border-none cursor-pointer text-[18px] transition-all ${
                callMode === "screen" ? "bg-[#8957e5] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]"
              }`}>
              <SvgScreen />
              <span className="text-[9px] font-medium">Screen</span>
            </button>
          </div>
          {callMode && (
            <div className="flex gap-1.5 mt-2">
              <button onClick={toggleMute}
                className={`flex-1 py-1.5 rounded-lg border-none cursor-pointer text-[12px] font-medium transition-all ${
                  isMuted ? "bg-[#f85149] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]"
                }`}>
                {isMuted ? "Unmute" : "Mute"}
              </button>
              {(callMode === "video" || callMode === "audio") && (
                <button onClick={toggleVideo}
                  className={`flex-1 py-1.5 rounded-lg border-none cursor-pointer text-[12px] font-medium transition-all ${
                    isVideoOff ? "bg-[#f85149] text-white" : "bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]"
                  }`}>
                  {isVideoOff ? "Cam On" : "Cam Off"}
                </button>
              )}
              <button onClick={leaveCall}
                className="flex-1 py-1.5 rounded-lg border-none cursor-pointer text-[12px] font-medium bg-[#f85149] text-white hover:bg-[#da3633] transition-all">
                Leave
              </button>
            </div>
          )}
          <div className="mt-2 text-center text-[11px] text-[#484f58]">
            {callMode ? `${callMode.toUpperCase()} · ${peers.length + 1}/${MAX_PEERS_PER_ROOM}` : "No active call"}
          </div>
        </div>
      </div>

      {/* ═══ MAIN CHAT ═══ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ─── Top bar ─── */}
        <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#21262d] flex items-center gap-3">
          <span className="text-lg flex-shrink-0">{(() => { const Icon = CHANNEL_ICON_MAP[activeChannel]; return Icon ? <Icon /> : <SvgHash />; })()}</span>
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
                {callMode === "video" ? "Video" : callMode === "audio" ? "Audio" : callMode === "voice" ? "Voice" : "Screen"}
                {" "}{callMode} · {peers.length + 1} connected
              </span>
            </div>
          )}
          {/* Three-dot toggle for online panel */}
          <button
            onClick={() => setShowOnlinePanel(v => !v)}
            className="ml-2 p-1.5 rounded-lg bg-transparent border border-[#21262d] text-[#8b949e] cursor-pointer hover:bg-[#21262d] hover:text-[#c9d1d9] transition-colors"
            title={showOnlinePanel ? "Hide online members" : "Show online members"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
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
                  <span className="absolute bottom-1.5 left-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded-md text-[11px] text-[#c9d1d9] flex items-center gap-1"><SvgScreen /> Screen Share</span>
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
              <div className="w-12 h-12 rounded-full bg-[#21262d] flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
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
                <div className="mb-3 text-[#1f6feb]">{(() => { const Icon = CHANNEL_ICON_MAP[activeChannel]; return Icon ? <Icon /> : <SvgHash />; })()}</div>
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
                    {/* Like button */}
                    <div className={`flex items-center gap-1 mt-0.5 ${own ? "justify-end" : "justify-start"}`}>
                      <button
                        onClick={() => {
                          setMessages(prev => prev.map(m =>
                            m.id === msg.id ? { ...m, likes: m.likes + 1, likedBy: [...(m.likedBy || []), auth.user?.id || "anon"] } : m
                          ))
                        }}
                        className="bg-transparent border-none text-[#484f58] cursor-pointer flex items-center gap-0.5 hover:text-[#f85149] transition-colors text-[11px] py-0 px-1"
                      >
                        <SvgHeart /> {msg.likes > 0 ? msg.likes : ""}
                      </button>
                    </div>
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
              {/* Emoji button */}
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-lg border border-[#21262d] bg-[#0d1117] cursor-pointer transition-all ${
                  showEmojiPicker ? "text-[#58a6ff] border-[#58a6ff]" : "text-[#8b949e] hover:text-[#c9d1d9] hover:border-[#30363d]"
                }`}>
                <SvgSmile />
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
                {sending ? "..." : <SvgSend />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ RIGHT SIDEBAR (Online Members) ═══ */}
      {showOnlinePanel && (
      <div className="w-[220px] bg-[#161b22] border-l border-[#21262d] flex-col overflow-hidden max-lg:hidden flex">
        <div className="px-3.5 py-3 border-b border-[#21262d] text-[12px] font-bold text-[#8b949e] uppercase flex items-center justify-between">
          <span>অনলাইন — {onlineUsers.filter(u => u.id !== auth.user?.id).length + (auth.user ? 1 : 0)}</span>
          <button onClick={() => setShowOnlinePanel(false)} className="bg-transparent border-none text-[#8b949e] cursor-pointer text-lg hover:text-[#c9d1d9] px-1 leading-none" title="Hide panel">✕</button>
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
      )}
    </div>
  )
}
