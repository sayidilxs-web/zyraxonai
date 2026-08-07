import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export const Route = createFileRoute('/builder')({
  head: () => ({
    meta: [
      { title: 'ZYRAXON Blueprint — Build & Publish Sites with AI' },
      { name: 'description', content: 'Describe a website, watch it build live, then publish it to GitHub Pages with your own custom domain — powered by free OpenCode Zen models.' },
      { property: 'og:title', content: 'ZYRAXON Blueprint — Build & Publish Sites with AI' },
      { property: 'og:description', content: 'AI website builder with live preview and one-click GitHub Pages publishing.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: BuilderPage,
})

/* ------------------------------------------------------------------ */
/* Models (free OpenCode Zen models — no API key needed)               */
/* ------------------------------------------------------------------ */

const MODELS = [
  { id: 'deepseek-v4-flash-free', label: 'DeepSeek V4 Flash', blurb: 'Fast, strong coder' },
  { id: 'mimo-v2.5-free', label: 'MiMo V2.5', blurb: 'Balanced reasoning' },
  { id: 'nemotron-3-ultra-free', label: 'Nemotron 3 Ultra', blurb: 'Large reasoning' },
  { id: 'longcat-2.0-free', label: 'LongCat 2.0', blurb: 'Long context' },
  { id: 'laguna-s-2.1-free', label: 'Laguna S 2.1', blurb: 'Light & quick' },
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

const STARTER = `<!doctype html><html><head><meta charset="utf-8"><title>Preview</title></head>
<body style="margin:0;display:grid;place-items:center;height:100vh;background:#0b0f18;color:#8b949e;font-family:system-ui">
<div style="text-align:center"><div style="font-size:38px">🧬</div><p>Describe your website in the chat — the live preview appears here.</p></div>
</body></html>`

/** Pull the last complete (or streaming) ```html block out of a reply. */
function extractHtml(text: string): string | null {
  const fences = [...text.matchAll(/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/gi)]
  if (!fences.length) return null
  const last = fences[fences.length - 1]![1] ?? ''
  return last.trim().length > 20 ? last : null
}

function stripFences(text: string): string {
  return text.replace(/```(?:html)?\s*\n[\s\S]*?(?:```|$)/gi, '\n_[code written to preview]_\n').trim()
}

const glass: React.CSSProperties = {
  background: 'rgba(22,27,34,0.55)',
  backdropFilter: 'blur(24px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 14,
}

function BuilderPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState(MODELS[0]!.id)
  const [streaming, setStreaming] = useState(false)
  const [html, setHtml] = useState(STARTER)
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [error, setError] = useState<string | null>(null)

  const [showPublish, setShowPublish] = useState(false)
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('')
  const [domain, setDomain] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => { try { localStorage.setItem(LS.model, model) } catch { /* */ } }, [model])
  useEffect(() => { try { localStorage.setItem(LS.chat, JSON.stringify(messages.slice(-30))) } catch { /* */ } }, [messages])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  const send = useCallback(async (text: string) => {
    const prompt = text.trim()
    if (!prompt || streaming) return
    setError(null)
    setInput('')

    const history: Msg[] = [...messages, { role: 'user', content: prompt }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/public/builder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: history }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const detail = await res.json().catch(() => null)
        throw new Error(detail?.detail || detail?.error || `Model request failed (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let acc = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (!payload || payload === '[DONE]') continue
          try {
            const json = JSON.parse(payload)
            const delta = json?.choices?.[0]?.delta?.content
            if (typeof delta === 'string' && delta) {
              acc += delta
              setMessages((prev) => {
                const next = [...prev]
                next[next.length - 1] = { role: 'assistant', content: acc }
                return next
              })
              const code = extractHtml(acc)
              if (code) setHtml(code)
            }
          } catch { /* partial chunk */ }
        }
      }

      const finalCode = extractHtml(acc)
      if (finalCode) {
        setHtml(finalCode)
        try { localStorage.setItem(LS.html, finalCode) } catch { /* */ }
      }
      if (!acc.trim()) throw new Error('The model returned an empty response. Try another model.')
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err?.message || 'Something went wrong.')
        setMessages((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.role === 'assistant' && !m.content)))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [messages, model, streaming])

  const publish = useCallback(async () => {
    setPublishing(true)
    setResult(null)
    try {
      localStorage.setItem(LS.token, token)
      localStorage.setItem(LS.repo, repo)
      localStorage.setItem(LS.domain, domain)
    } catch { /* */ }
    try {
      const res = await fetch('/api/public/builder/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, repo, html, customDomain: domain, description: 'Built with ZYRAXON Blueprint' }),
      })
      setResult(await res.json())
    } catch (err: any) {
      setResult({ ok: false, error: err?.message || 'Publish failed' })
    } finally {
      setPublishing(false)
    }
  }, [token, repo, domain, html])

  const previewWidth = device === 'desktop' ? '100%' : device === 'tablet' ? 834 : 390

  const suggestions = useMemo(() => [
    'A SaaS landing page for an AI code agent, dark neon theme, pricing table and FAQ',
    'A personal portfolio with projects grid, about section and contact form',
    'A documentation site with sidebar navigation and search',
  ], [])

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', fontSize: 12, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${active ? 'rgba(88,166,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
    background: active ? 'rgba(56,139,253,0.18)' : 'rgba(28,34,46,0.5)',
    color: active ? '#58a6ff' : '#8b949e',
  })

  return (
    <div className="zx-glass-root" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh', color: '#c9d1d9', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div className="zx-aurora" aria-hidden="true" />

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(28px)', zIndex: 2 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#c9d1d9' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: 'linear-gradient(135deg,#00f5ff,#8957e5)', boxShadow: '0 0 14px rgba(0,245,255,0.7)' }} />
          <strong style={{ fontSize: 15 }}>ZYRAXON Blueprint</strong>
        </a>
        <span style={{ fontSize: 11, color: '#8b949e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 10px' }}>OpenCode Zen · free models</span>
        <div style={{ flex: 1 }} />
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{ ...btn(false), padding: '7px 10px', color: '#c9d1d9' }}
        >
          {MODELS.map((m) => <option key={m.id} value={m.id} style={{ background: '#161b22' }}>{m.label} — {m.blurb}</option>)}
        </select>
        <button onClick={() => setShowPublish(true)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#00f5ff,#8957e5)', color: '#04070d' }}>
          Publish to GitHub Pages
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, gap: 12, padding: 12, zIndex: 1 }}>
        {/* Chat */}
        <section style={{ ...glass, width: 400, minWidth: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ color: '#8b949e', fontSize: 13, lineHeight: 1.7 }}>
                <p style={{ marginTop: 0 }}>Describe the website you want. The AI writes a complete site and it renders live on the right. Then publish it straight to your GitHub Pages — with a custom domain if you own one.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} style={{ ...btn(false), textAlign: 'left', padding: '10px 12px', lineHeight: 1.5, color: '#c9d1d9' }}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '92%', padding: '10px 13px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                border: '1px solid rgba(255,255,255,0.08)',
                background: m.role === 'user' ? 'rgba(56,139,253,0.16)' : 'rgba(28,34,46,0.6)',
                color: m.role === 'user' ? '#cfe6ff' : '#c9d1d9',
              }}>
                {m.role === 'assistant' ? (stripFences(m.content) || (streaming && i === messages.length - 1 ? 'Building…' : '…')) : m.content}
              </div>
            ))}
            {error && <div style={{ fontSize: 12, color: '#ff7b72', border: '1px solid rgba(248,81,73,0.35)', background: 'rgba(248,81,73,0.1)', padding: '8px 10px', borderRadius: 10 }}>{error}</div>}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: 10 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              placeholder="Build me a… (Enter to send, Shift+Enter for newline)"
              rows={3}
              style={{ width: '100%', resize: 'none', boxSizing: 'border-box', padding: 10, fontSize: 13, fontFamily: 'inherit', color: '#c9d1d9', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {streaming ? (
                <button onClick={() => abortRef.current?.abort()} style={{ ...btn(false), flex: 1, padding: '9px 12px', color: '#ff7b72' }}>Stop</button>
              ) : (
                <button onClick={() => send(input)} disabled={!input.trim()} style={{ flex: 1, padding: '9px 12px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', background: input.trim() ? 'linear-gradient(135deg,#00f5ff,#8957e5)' : 'rgba(48,54,61,0.6)', color: input.trim() ? '#04070d' : '#8b949e' }}>Send</button>
              )}
              <button onClick={() => { setMessages([]); setError(null) }} style={{ ...btn(false), padding: '9px 12px' }}>Clear</button>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section style={{ ...glass, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={() => setTab('preview')} style={btn(tab === 'preview')}>Preview</button>
            <button onClick={() => setTab('code')} style={btn(tab === 'code')}>Code</button>
            <div style={{ flex: 1 }} />
            {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)} style={btn(device === d)}>{d === 'desktop' ? '🖥' : d === 'tablet' ? '📱' : '📲'}</button>
            ))}
            <button
              onClick={() => {
                const blob = new Blob([html], { type: 'text/html' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'index.html'
                a.click()
                URL.revokeObjectURL(a.href)
              }}
              style={btn(false)}
            >Download</button>
            <button onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close() } }} style={btn(false)}>Open ↗</button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: device === 'desktop' ? 0 : 16, display: 'flex', justifyContent: 'center', background: 'rgba(8,11,17,0.5)' }}>
            {tab === 'preview' ? (
              <iframe
                title="Live preview"
                srcDoc={html}
                sandbox="allow-scripts allow-forms allow-popups allow-modals"
                style={{ width: previewWidth, maxWidth: '100%', height: '100%', minHeight: 400, border: device === 'desktop' ? 'none' : '1px solid rgba(255,255,255,0.12)', borderRadius: device === 'desktop' ? 0 : 12, background: '#fff' }}
              />
            ) : (
              <pre style={{ margin: 0, padding: 16, width: '100%', overflow: 'auto', fontSize: 12, lineHeight: 1.6, color: '#c9d1d9', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{html}</pre>
            )}
          </div>
        </section>
      </div>

      {/* Publish modal */}
      {showPublish && (
        <div onClick={() => setShowPublish(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(2,4,8,0.65)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...glass, width: 'min(560px, 100%)', maxHeight: '86vh', overflowY: 'auto', padding: 22 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>Publish to GitHub Pages</h2>
            <p style={{ margin: '0 0 18px', fontSize: 12.5, color: '#8b949e', lineHeight: 1.6 }}>
              Paste a GitHub personal access token with the <code>repo</code> scope (classic) — it stays in your browser and is only forwarded to GitHub for this publish.{' '}
              <a href="https://github.com/settings/tokens/new?scopes=repo&description=ZYRAXON%20Blueprint" target="_blank" rel="noopener noreferrer" style={{ color: '#58a6ff' }}>Create token ↗</a>
            </p>

            {[
              { label: 'GitHub access token', value: token, set: setToken, ph: 'ghp_…', type: 'password' },
              { label: 'Repository name', value: repo, set: setRepo, ph: 'my-new-site', type: 'text' },
              { label: 'Custom domain (optional)', value: domain, set: setDomain, ph: 'www.mysite.com', type: 'text' },
            ].map((f) => (
              <label key={f.label} style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ display: 'block', fontSize: 12, color: '#8b949e', marginBottom: 6 }}>{f.label}</span>
                <input
                  type={f.type}
                  value={f.value}
                  placeholder={f.ph}
                  onChange={(e) => f.set(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', color: '#c9d1d9', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, outline: 'none' }}
                />
              </label>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button onClick={publish} disabled={publishing || !token || !repo} style={{ flex: 1, padding: '11px 12px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: publishing ? 'wait' : 'pointer', fontFamily: 'inherit', background: token && repo ? 'linear-gradient(135deg,#00f5ff,#8957e5)' : 'rgba(48,54,61,0.6)', color: token && repo ? '#04070d' : '#8b949e' }}>
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
              <button onClick={() => setShowPublish(false)} style={{ ...btn(false), padding: '11px 16px' }}>Close</button>
            </div>

            {result && (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 12, fontSize: 12.5, lineHeight: 1.7, border: `1px solid ${result.ok ? 'rgba(63,185,80,0.35)' : 'rgba(248,81,73,0.35)'}`, background: result.ok ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)' }}>
                {result.ok ? (
                  <>
                    <div style={{ color: '#3fb950', fontWeight: 600, marginBottom: 6 }}>Published ✓</div>
                    <div>Site: <a href={result.pagesUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#58a6ff' }}>{result.pagesUrl}</a></div>
                    <div>Repo: <a href={result.repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#58a6ff' }}>{result.repoUrl}</a></div>
                    {result.dns?.length ? (
                      <>
                        <div style={{ marginTop: 10, color: '#8b949e' }}>Point <strong style={{ color: '#c9d1d9' }}>{result.customDomain}</strong> at GitHub with these DNS records:</div>
                        <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#c9d1d9' }}>
                          {result.dns.map((d: any, i: number) => <li key={i}><code>{d.type} {d.name} → {d.value}</code></li>)}
                        </ul>
                      </>
                    ) : null}
                    <div style={{ marginTop: 10, color: '#8b949e' }}>{result.note}</div>
                  </>
                ) : (
                  <span style={{ color: '#ff7b72' }}>{result.error}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
