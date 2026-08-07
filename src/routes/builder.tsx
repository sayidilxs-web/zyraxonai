import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export const Route = createFileRoute('/builder')({
  head: () => ({
    meta: [
      { title: 'ZYRAXON Blueprint — AI Website Builder' },
      { name: 'description', content: 'Build production-ready websites with AI. Describe your site, watch it build live, publish to GitHub Pages.' },
      { property: 'og:title', content: 'ZYRAXON Blueprint — AI Website Builder' },
      { property: 'og:description', content: 'AI website builder with live preview and one-click GitHub Pages publishing.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: BuilderPage,
})

/* ------------------------------------------------------------------ */
/* Models — free + paid from OpenCode Zen                              */
/* ------------------------------------------------------------------ */

const MODELS = [
  { id: 'big-pickle', label: 'Big Pickle', blurb: 'Most powerful', badge: 'BEST' },
  { id: 'deepseek-v4-flash-free', label: 'DeepSeek V4 Flash', blurb: 'Fast coder', badge: 'FREE' },
  { id: 'mimo-v2.5-free', label: 'MiMo V2.5', blurb: 'Balanced', badge: 'FREE' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', blurb: 'Google fast', badge: '' },
  { id: 'gpt-5-nano', label: 'GPT-5 Nano', blurb: 'Compact', badge: '' },
  { id: 'nemotron-3-ultra-free', label: 'Nemotron 3 Ultra', blurb: 'Large reasoning', badge: 'FREE' },
  { id: 'longcat-2.0-free', label: 'LongCat 2.0', blurb: 'Long context', badge: 'FREE' },
  { id: 'laguna-s-2.1-free', label: 'Laguna S 2.1', blurb: 'Light & quick', badge: 'FREE' },
  { id: 'qwen3.5-plus', label: 'Qwen 3.5 Plus', blurb: 'Alibaba coder', badge: '' },
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', blurb: 'Pro tier', badge: '' },
]

type Msg = { role: 'user' | 'assistant'; content: string }

const LS = {
  token: 'zyraxon.blueprint.ghtoken',
  repo: 'zyraxon.blueprint.repo',
  domain: 'zyraxon.blueprint.domain',
  html: 'zyraxon.blueprint.html',
  chat: 'zyraxon.blueprint.chat',
  model: 'zyraxon.blueprint.model',
}

const STARTER = `<!doctype html><html><head><meta charset="utf-8"><title>Preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;display:grid;place-items:center;height:100vh;background:#0a0a0b;color:#71717a;font-family:Inter,system-ui,sans-serif">
<div style="text-align:center;max-width:420px;padding:24px">
<div style="font-size:56px;margin-bottom:20px;filter:drop-shadow(0 0 40px rgba(139,92,246,0.4))">🧬</div>
<h1 style="font-size:28px;font-weight:800;letter-spacing:-0.03em;color:#fafafa;margin:0 0 12px">ZYRAXON Blueprint</h1>
<p style="font-size:15px;line-height:1.7;color:#71717a;margin:0">Describe your website in the chat — the live preview appears here.</p>
</div></body></html>`

function extractHtml(text: string): string | null {
  const fences = [...text.matchAll(/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/gi)]
  if (!fences.length) return null
  const last = fences[fences.length - 1]![1] ?? ''
  return last.trim().length > 20 ? last : null
}

function stripFences(text: string): string {
  return text
    .replace(/```(?:html)?\s*\n[\s\S]*?(?:```|$)/gi, '\n→ code written to the live preview\n')
    .replace(/<\/?think(?:ing)?>/gi, '')
    .trim()
}

/* ------------------------------------------------------------------ */
/* SVG Icons (inline)                                                  */
/* ------------------------------------------------------------------ */

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
)

const IconStop = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3" /></svg>
)

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const IconExternal = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const IconDesktop = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

const IconTablet = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" />
  </svg>
)

const IconMobile = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" />
  </svg>
)

const IconCode = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
)

const IconEye = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
)

const IconClear = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const IconSparkle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5z" />
  </svg>
)

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const IconRocket = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
)

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

/* ------------------------------------------------------------------ */
/* BuilderPage                                                         */
/* ------------------------------------------------------------------ */

function BuilderPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState(MODELS[0]!.id)
  const [streaming, setStreaming] = useState(false)
  const [html, setHtml] = useState(STARTER)
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [error, setError] = useState<string | null>(null)
  const [showModelDropdown, setShowModelDropdown] = useState(false)

  const [showPublish, setShowPublish] = useState(false)
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('')
  const [domain, setDomain] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* restore session */
  useEffect(() => {
    try {
      setToken(localStorage.getItem(LS.token) || '')
      setRepo(localStorage.getItem(LS.repo) || '')
      setDomain(localStorage.getItem(LS.domain) || '')
      setModel(localStorage.getItem(LS.model) || MODELS[0]!.id)
      const savedHtml = localStorage.getItem(LS.html)
      if (savedHtml) setHtml(savedHtml)
      const savedChat = localStorage.getItem(LS.chat)
      if (savedChat) setMessages(JSON.parse(savedChat))
    } catch { /* ignore */ }
  }, [])

  /* auto-scroll */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  /* persist */
  useEffect(() => {
    try {
      localStorage.setItem(LS.html, html)
      localStorage.setItem(LS.chat, JSON.stringify(messages.slice(-50)))
      localStorage.setItem(LS.model, model)
      localStorage.setItem(LS.token, token)
      localStorage.setItem(LS.repo, repo)
      localStorage.setItem(LS.domain, domain)
    } catch { /* ignore */ }
  }, [html, messages, model, token, repo, domain])

  /* close model dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const send = useCallback(async (text?: string) => {
    const t = (text ?? input).trim()
    if (!t || streaming) return
    setInput('')
    setError(null)

    const userMsg: Msg = { role: 'user', content: t }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setStreaming(true)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/public/builder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: updated.map((m) => ({ role: m.role, content: m.content })) }),
        signal: abort.signal,
      })

      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const dec = new TextDecoder()
      let acc = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += dec.decode(value, { stream: true })
        const m: Msg = { role: 'assistant', content: acc }
        setMessages([...updated, m])
        const h = extractHtml(acc)
        if (h) setHtml(h)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message || 'Stream failed')
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, streaming, messages, model])

  const publish = useCallback(async () => {
    if (!token || !repo) return
    setPublishing(true)
    setResult(null)
    try {
      const res = await fetch('/api/public/builder/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, repo, domain: domain || undefined, html }),
      })
      const j = await res.json()
      setResult(j)
    } catch (err: any) {
      setResult({ ok: false, error: err?.message || 'Publish failed' })
    } finally {
      setPublishing(false)
    }
  }, [token, repo, domain, html])

  const previewWidth = device === 'desktop' ? '100%' : device === 'tablet' ? 834 : 390

  const suggestions = useMemo(() => [
    { text: 'A SaaS landing page for an AI code agent — dark neon theme, pricing table, testimonials, FAQ, CTA buttons', icon: '🚀' },
    { text: 'A personal portfolio with project grid, about section, skills bar charts, and contact form', icon: '💼' },
    { text: 'A documentation site with sidebar navigation, search, code blocks, and breadcrumbs', icon: '📚' },
    { text: 'An e-commerce product page with image gallery, reviews, add to cart, and size selector', icon: '🛒' },
  ], [])

  const currentModel = MODELS.find((m) => m.id === model) || MODELS[0]!

  const textareaAutoResize = useCallback(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
    }
  }, [])

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      color: '#e4e4e7',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: '#09090b',
      overflow: 'hidden',
    }}>

      {/* Background gradient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* ─── Header ──────────────────────────────────────────────── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(9,9,11,0.85)',
        backdropFilter: 'blur(20px)',
        zIndex: 20,
        position: 'relative',
      }}>
        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#e4e4e7' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 0 20px rgba(139,92,246,0.3)',
          }}>
            <span style={{ fontSize: 14 }}>🧬</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>Blueprint</span>
        </a>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

        {/* Model Selector */}
        <div ref={modelDropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: '#a1a1aa', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {currentModel.badge && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                padding: '1px 5px', borderRadius: 4,
                background: currentModel.badge === 'BEST' ? 'rgba(139,92,246,0.2)' : 'rgba(34,197,94,0.15)',
                color: currentModel.badge === 'BEST' ? '#a78bfa' : '#4ade80',
              }}>{currentModel.badge}</span>
            )}
            <span>{currentModel.label}</span>
            <IconChevronDown />
          </button>

          {showModelDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              width: 280, borderRadius: 12, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(18,18,20,0.98)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              zIndex: 100,
            }}>
              <div style={{ padding: '8px 12px', fontSize: 10, fontWeight: 600, color: '#71717a', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                Select Model
              </div>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setModel(m.id); setShowModelDropdown(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 12px',
                    border: 'none', background: m.id === model ? 'rgba(139,92,246,0.1)' : 'transparent',
                    color: '#e4e4e7', fontSize: 13, cursor: 'pointer',
                    textAlign: 'left' as const, fontFamily: 'inherit',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (m.id !== model) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={(e) => { if (m.id !== model) e.currentTarget.style.background = 'transparent' }}
                >
                  {m.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                      padding: '1px 5px', borderRadius: 4, minWidth: 44, textAlign: 'center' as const,
                      background: m.badge === 'BEST' ? 'rgba(139,92,246,0.2)' : 'rgba(34,197,94,0.15)',
                      color: m.badge === 'BEST' ? '#a78bfa' : '#4ade80',
                    }}>{m.badge}</span>
                  )}
                  {!m.badge && <span style={{ minWidth: 44 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: '#71717a', marginTop: 1 }}>{m.blurb}</div>
                  </div>
                  {m.id === model && <span style={{ color: '#8b5cf6' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Status */}
        {streaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8b5cf6' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', animation: 'pulse 1.5s ease-in-out infinite' }} />
            Building…
          </div>
        )}

        {/* Publish Button */}
        <button
          onClick={() => setShowPublish(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', fontSize: 12, fontWeight: 600,
            borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))',
            color: '#c4b5fd', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.15))' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))' }}
        >
          <IconRocket /> Deploy
        </button>
      </header>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, gap: 0, zIndex: 1, position: 'relative' }}>

        {/* ─── Chat Panel ───────────────────────────────────────── */}
        <section style={{
          width: 420, minWidth: 340, maxWidth: 480,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(9,9,11,0.6)',
        }}>
          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '24px 16px', textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))',
                  display: 'grid', placeItems: 'center', marginBottom: 20,
                  border: '1px solid rgba(139,92,246,0.2)',
                }}>
                  <IconSparkle />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#fafafa', letterSpacing: '-0.02em' }}>
                  What do you want to build?
                </h3>
                <p style={{ fontSize: 13, color: '#71717a', lineHeight: 1.6, margin: '0 0 24px', maxWidth: 300 }}>
                  Describe your website and AI will build it live. Then deploy to GitHub Pages.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  {suggestions.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => send(s.text)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px', borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.02)',
                        color: '#a1a1aa', fontSize: 12.5, lineHeight: 1.5,
                        cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; e.currentTarget.style.background = 'rgba(139,92,246,0.06)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                      <span>{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                fontSize: 13, lineHeight: 1.65,
                whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const,
                background: m.role === 'user' ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (m.role === 'user' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)'),
                color: m.role === 'user' ? '#c4b5fd' : '#d4d4d8',
              }}>
                {m.role === 'assistant' ? (stripFences(m.content) || (streaming && i === messages.length - 1 ? 'Building…' : '…')) : m.content}
              </div>
            ))}

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.08)',
                fontSize: 12.5, color: '#fca5a5',
                lineHeight: 1.5,
              }}>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>Error: </span>{error}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: 12,
            background: 'rgba(9,9,11,0.5)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              padding: '8px 10px 8px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              transition: 'border-color 0.15s',
            }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); textareaAutoResize() }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
                }}
                placeholder="Describe your website…"
                rows={1}
                style={{
                  flex: 1, resize: 'none', border: 'none', outline: 'none',
                  padding: '6px 0', fontSize: 13, lineHeight: 1.5,
                  fontFamily: 'inherit', color: '#e4e4e7',
                  background: 'transparent', minHeight: 22, maxHeight: 200,
                }}
              />
              {streaming ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: 'none', display: 'grid', placeItems: 'center',
                    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                    cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                  }}
                >
                  <IconStop />
                </button>
              ) : (
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim()}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: 'none', display: 'grid', placeItems: 'center',
                    background: input.trim() ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' : 'rgba(255,255,255,0.05)',
                    color: input.trim() ? '#fff' : '#52525b',
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    flexShrink: 0, transition: 'all 0.15s',
                  }}
                >
                  <IconSend />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <button
                onClick={() => { setMessages([]); setError(null); setHtml(STARTER) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px', borderRadius: 6,
                  border: 'none', background: 'transparent',
                  color: '#52525b', fontSize: 11, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#a1a1aa' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#52525b' }}
              >
                <IconClear /> Clear
              </button>
              <span style={{ fontSize: 11, color: '#3f3f46' }}>Enter to send · Shift+Enter newline</span>
            </div>
          </div>
        </section>

        {/* ─── Preview Panel ─────────────────────────────────────── */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(9,9,11,0.5)',
          }}>
            {/* Tab: Preview / Code */}
            <div style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
              <button
                onClick={() => setTab('preview')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: tab === 'preview' ? 'rgba(139,92,246,0.15)' : 'transparent',
                  color: tab === 'preview' ? '#c4b5fd' : '#71717a',
                }}
              >
                <IconEye /> Preview
              </button>
              <button
                onClick={() => setTab('code')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: tab === 'code' ? 'rgba(139,92,246,0.15)' : 'transparent',
                  color: tab === 'code' ? '#c4b5fd' : '#71717a',
                }}
              >
                <IconCode /> Code
              </button>
            </div>

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

            {/* Device selector */}
            <div style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
              {([
                { id: 'desktop' as const, icon: '🖥', label: 'Desktop' },
                { id: 'tablet' as const, icon: '📱', label: 'Tablet' },
                { id: 'mobile' as const, icon: '📲', label: 'Mobile' },
              ]).map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDevice(d.id)}
                  title={d.label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 8px', borderRadius: 6, border: 'none', fontSize: 11,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    background: device === d.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: device === d.id ? '#e4e4e7' : '#52525b',
                  }}
                >
                  {d.icon} <span style={{ fontSize: 11 }}>{d.label}</span>
                </button>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            {/* Actions */}
            <button
              onClick={() => {
                const blob = new Blob([html], { type: 'text/html' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'index.html'
                a.click()
                URL.revokeObjectURL(a.href)
              }}
              title="Download HTML"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 8px', borderRadius: 6, border: 'none', fontSize: 11,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                background: 'transparent', color: '#71717a',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#e4e4e7'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#71717a'; e.currentTarget.style.background = 'transparent' }}
            >
              <IconDownload /> Download
            </button>
            <button
              onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close() } }}
              title="Open in new tab"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 8px', borderRadius: 6, border: 'none', fontSize: 11,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                background: 'transparent', color: '#71717a',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#e4e4e7'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#71717a'; e.currentTarget.style.background = 'transparent' }}
            >
              <IconExternal /> Open
            </button>
          </div>

          {/* Preview / Code Area */}
          <div style={{
            flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center',
            background: '#0a0a0b',
            padding: device === 'desktop' ? 0 : 24,
          }}>
            {tab === 'preview' ? (
              <iframe
                title="Live preview"
                srcDoc={html}
                sandbox="allow-scripts allow-forms allow-popups allow-modals"
                style={{
                  width: previewWidth, maxWidth: '100%', height: '100%', minHeight: 400,
                  border: device === 'desktop' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: device === 'desktop' ? 0 : 12,
                  background: '#fff',
                  boxShadow: device !== 'desktop' ? '0 0 60px rgba(0,0,0,0.3)' : 'none',
                }}
              />
            ) : (
              <pre style={{
                margin: 0, padding: 20, width: '100%', overflow: 'auto',
                fontSize: 12.5, lineHeight: 1.7,
                color: '#a1a1aa',
                fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
                tabSize: 2,
              }}>{html}</pre>
            )}
          </div>
        </section>
      </div>

      {/* ─── Publish Modal ──────────────────────────────────────── */}
      {showPublish && (
        <div
          onClick={() => setShowPublish(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'grid', placeItems: 'center', padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(500px, 100%)', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(18,18,20,0.98)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              padding: 28,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fafafa', letterSpacing: '-0.02em' }}>Deploy to GitHub Pages</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#71717a' }}>Publish your site live in seconds</p>
              </div>
              <button
                onClick={() => setShowPublish(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#71717a', cursor: 'pointer',
                  display: 'grid', placeItems: 'center',
                }}
              >
                <IconX />
              </button>
            </div>

            <p style={{ margin: '0 0 18px', fontSize: 12, color: '#71717a', lineHeight: 1.6 }}>
              Paste a GitHub personal access token with <code style={{ padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', fontSize: 11 }}>repo</code> scope. It stays in your browser only.{' '}
              <a href="https://github.com/settings/tokens/new?scopes=repo&description=ZYRAXON%20Blueprint" target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6' }}>Create token ↗</a>
            </p>

            {/* Fields */}
            {[
              { label: 'GitHub Access Token', value: token, set: setToken, ph: 'ghp_…', type: 'password' },
              { label: 'Repository Name', value: repo, set: setRepo, ph: 'my-new-site', type: 'text' },
              { label: 'Custom Domain', value: domain, set: setDomain, ph: 'www.mysite.com (optional)', type: 'text' },
            ].map((f) => (
              <label key={f.label} style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#a1a1aa', marginBottom: 6 }}>{f.label}</span>
                <input
                  type={f.type}
                  value={f.value}
                  placeholder={f.ph}
                  onChange={(e) => f.set(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px', fontSize: 13, fontFamily: 'inherit',
                    color: '#e4e4e7',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                />
              </label>
            ))}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={publish}
                disabled={publishing || !token || !repo}
                style={{
                  flex: 1, padding: '11px 16px', fontSize: 13, fontWeight: 600,
                  borderRadius: 10, border: 'none', cursor: publishing ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  background: token && repo ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' : 'rgba(255,255,255,0.05)',
                  color: token && repo ? '#fff' : '#52525b',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {publishing ? 'Deploying…' : 'Deploy Now'}
              </button>
              <button
                onClick={() => setShowPublish(false)}
                style={{
                  padding: '11px 20px', fontSize: 13,
                  borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent', color: '#a1a1aa',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>

            {/* Result */}
            {result && (
              <div style={{
                marginTop: 18, padding: 16, borderRadius: 12,
                fontSize: 12.5, lineHeight: 1.7,
                border: '1px solid ' + (result.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'),
                background: result.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
              }}>
                {result.ok ? (
                  <>
                    <div style={{ color: '#4ade80', fontWeight: 600, marginBottom: 8, fontSize: 13 }}>✓ Deployed successfully</div>
                    <div style={{ marginBottom: 4 }}>Site: <a href={result.pagesUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6' }}>{result.pagesUrl}</a></div>
                    <div>Repo: <a href={result.repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6' }}>{result.repoUrl}</a></div>
                    {result.dns?.length ? (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ color: '#71717a', marginBottom: 4 }}>DNS records for <strong style={{ color: '#a1a1aa' }}>{result.customDomain}</strong>:</div>
                        <ul style={{ margin: 0, paddingLeft: 16, color: '#a1a1aa' }}>
                          {result.dns.map((d: any, i: number) => <li key={i}><code style={{ fontSize: 11 }}>{d.type} {d.name} → {d.value}</code></li>)}
                        </ul>
                      </div>
                    ) : null}
                    {result.note && <div style={{ marginTop: 8, color: '#71717a' }}>{result.note}</div>}
                  </>
                ) : (
                  <span style={{ color: '#fca5a5' }}>{result.error}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Animations ─────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        *:focus-visible { outline: 2px solid rgba(139,92,246,0.5); outline-offset: 2px; }
      `}</style>
    </div>
  )
}
