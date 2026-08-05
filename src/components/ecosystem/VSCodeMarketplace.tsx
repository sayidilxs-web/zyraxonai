import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Visual Studio Marketplace browser — real extensions from the official
 * gallery, rendered the way VS Code's marketplace renders them.
 * All data comes from /api/public/vscode-marketplace (server-side proxy).
 */

export interface VSExtension {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: { name: string; displayName: string; verified: boolean; domain: string | null };
  icon: string | null;
  installs: number;
  updateCount: number;
  rating: number;
  ratingCount: number;
  trendingWeekly: number;
  categories: string[];
  tags: string[];
  lastUpdated: string;
  publishedDate: string;
  preview: boolean;
  repository: string | null;
  homepage: string | null;
  license: string | null;
  changelog: string | null;
  readmeUrl: string | null;
  vsix: string | null;
  marketplaceUrl: string;
  installUri: string;
  brandingColor: string | null;
}

const API = '/api/public/vscode-marketplace';

const CATEGORIES = [
  'All', 'Programming Languages', 'Snippets', 'Linters', 'Themes', 'Debuggers',
  'Formatters', 'Keymaps', 'SCM Providers', 'Other', 'Extension Packs',
  'Language Packs', 'Data Science', 'Machine Learning', 'Visualization',
  'Notebooks', 'Education', 'Testing', 'AI', 'Chat',
];

const SORTS = [
  { id: 'installs', label: 'Install Count' },
  { id: 'rating', label: 'Rating' },
  { id: 'trending', label: 'Trending Weekly' },
  { id: 'updated', label: 'Recently Updated' },
  { id: 'name', label: 'Name' },
  { id: 'relevance', label: 'Relevance' },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 12 }) => (
  <span style={{ display: 'inline-flex', gap: 1 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24"
        fill={i <= Math.round(value) ? '#e3b341' : '#30363d'}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </span>
);

const Verified = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="#58a6ff" aria-label="Verified publisher">
    <path d="M12 1l2.6 2.1 3.3-.3.9 3.2 2.9 1.7-1.4 3 1.4 3-2.9 1.7-.9 3.2-3.3-.3L12 23l-2.6-2.1-3.3.3-.9-3.2L2.3 16l1.4-3-1.4-3 2.9-1.7.9-3.2 3.3.3z" />
    <path d="M10.6 15.4l-2.8-2.8 1.2-1.2 1.6 1.6 4-4 1.2 1.2z" fill="#0d1117" />
  </svg>
);

/* ---------- tiny markdown renderer with a safe HTML allowlist ---------- */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'em', 'i', 'strong', 'b', 'u', 'a', 'img', 'code', 'pre', 'kbd', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'div', 'span', 'center', 'small', 'sub', 'sup',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary', 'picture', 'source',
]);

function sanitizeHtml(s: string) {
  return s
    // drop dangerous elements entirely (with their content)
    .replace(/<(script|style|iframe|object|embed|form|link|meta)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|link|meta)\b[^>]*\/?>/gi, '')
    // strip inline event handlers and javascript: urls
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"')
    // escape any tag that is not on the allowlist
    .replace(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g, (m, tag: string) =>
      ALLOWED_TAGS.has(tag.toLowerCase()) ? m : m.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
    // escape stray angle brackets that are not part of a tag
    .replace(/<(?![/a-zA-Z!])/g, '&lt;');
}

function renderMarkdown(md: string, baseRepo: string | null): string {
  let out = sanitizeHtml(md);

  const blocks: string[] = [];
  out = out.replace(/```[\w-]*\n?([\s\S]*?)```/g, (_m, code: string) => {
    blocks.push(`<pre><code>${code.replace(/\n$/, '')}</code></pre>`);
    return `\u0000BLOCK${blocks.length - 1}\u0000`;
  });
  out = out
    .replace(/^######\s+(.*)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.*)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
    .replace(/^\s*[-*]{3,}\s*$/gm, '<hr/>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_m, alt: string, src: string) => {
      const abs = /^https?:/.test(src)
        ? src
        : baseRepo
          ? `${baseRepo.replace(/\.git$/, '').replace('github.com', 'raw.githubusercontent.com')}/HEAD/${src.replace(/^\.?\//, '')}`
          : '';
      return abs ? `<img src="${abs}" alt="${alt}" loading="lazy"/>` : '';
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>')
    .replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>');
  out = out.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
  out = out
    .split(/\n{2,}/)
    .map((p) => (/^\s*<(h\d|ul|ol|pre|hr|img|table|blockquote|p|div|center|details|a\b|span)/i.test(p.trim()) || p.includes('\u0000BLOCK') ? p : `<p>${p.replace(/\n/g, '<br/>')}</p>`))
    .join('\n');
  out = out.replace(/\u0000BLOCK(\d+)\u0000/g, (_m, i: string) => blocks[Number(i)] ?? '');
  return out;
}

/* ---------------------------- extension row ---------------------------- */
const Row: React.FC<{ ext: VSExtension; onOpen: () => void }> = ({ ext, onOpen }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', gap: 14, padding: 14, cursor: 'pointer',
        background: hover ? '#1c2128' : '#161b22',
        border: `1px solid ${hover ? '#30363d' : '#21262d'}`,
        borderRadius: 10, transition: 'background 0.12s ease, border-color 0.12s ease',
      }}
    >
      <img
        src={ext.icon ?? 'https://cdn.vsassets.io/v/M190_20210811.1/_content/Header/default_icon.png'}
        alt=""
        width={48} height={48} loading="lazy"
        style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', background: '#0d1117', flexShrink: 0 }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{ext.displayName}</span>
          <span style={{ fontSize: 12, color: '#8b949e' }}>v{ext.version}</span>
          {ext.preview && <span style={{ fontSize: 10, color: '#d29922', border: '1px solid #d2992255', borderRadius: 4, padding: '0 5px' }}>PREVIEW</span>}
        </div>
        <p style={{
          margin: '4px 0 6px', fontSize: 12.5, color: '#8b949e', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{ext.description}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#8b949e', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#58a6ff' }}>
            {ext.publisher.displayName}{ext.publisher.verified && <Verified />}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            {fmt(ext.installs)}
          </span>
          {ext.ratingCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Stars value={ext.rating} />({ext.ratingCount})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ detail view ------------------------------ */
const Detail: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const [ext, setExt] = useState<VSExtension | null>(null);
  const [readme, setReadme] = useState<string | null>(null);
  const [tab, setTab] = useState<'details' | 'changelog' | 'resources'>('details');
  const [changelog, setChangelog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setExt(null); setReadme(null); setChangelog(null); setTab('details');
    (async () => {
      try {
        const res = await fetch(`${API}?ext=${encodeURIComponent(id)}&readme=1`);
        const data = await res.json();
        if (!alive) return;
        setExt(data.item ?? null);
        setReadme(data.readme ?? null);
      } catch { /* handled by empty state */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  const loadChangelog = useCallback(async () => {
    setTab('changelog');
    if (changelog !== null || !ext?.changelog) return;
    try {
      const r = await fetch(ext.changelog);
      setChangelog(r.ok ? await r.text() : '');
    } catch { setChangelog(''); }
  }, [changelog, ext]);

  const html = useMemo(
    () => (tab === 'changelog' ? renderMarkdown(changelog ?? '', ext?.repository ?? null) : renderMarkdown(readme ?? '', ext?.repository ?? null)),
    [tab, readme, changelog, ext],
  );

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#8b949e' }}>Loading extension…</div>;
  if (!ext) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#8b949e' }}>
      Extension not found. <button onClick={onBack} style={linkBtn}>Go back</button>
    </div>
  );

  const copyInstall = () => {
    navigator.clipboard?.writeText(`code --install-extension ${ext.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button onClick={onBack} style={{ ...linkBtn, alignSelf: 'flex-start' }}>← Back to Marketplace</button>

      <div style={{
        display: 'flex', gap: 20, padding: 20, borderRadius: 12,
        background: ext.brandingColor ? `linear-gradient(135deg, ${ext.brandingColor}55, #161b22 70%)` : '#161b22',
        border: '1px solid #21262d', flexWrap: 'wrap',
      }}>
        <img src={ext.icon ?? ''} alt="" width={112} height={112}
          style={{ width: 112, height: 112, borderRadius: 12, objectFit: 'contain', background: '#0d1117' }} />
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e6edf3', margin: 0 }}>{ext.displayName}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 10px', fontSize: 13, color: '#8b949e', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#58a6ff' }}>
              {ext.publisher.displayName}{ext.publisher.verified && <Verified />}
            </span>
            <span>|</span>
            <span>{fmt(ext.installs)} installs</span>
            {ext.ratingCount > 0 && (<><span>|</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Stars value={ext.rating} />({ext.ratingCount})</span></>)}
            <span>|</span><span>v{ext.version}</span>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: '#b1bac4', lineHeight: 1.5 }}>{ext.description}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={ext.installUri} style={primaryBtn}>Install</a>
            {ext.vsix && <a href={ext.vsix} style={ghostBtn} download>Download VSIX</a>}
            <button onClick={copyInstall} style={ghostBtn}>{copied ? 'Copied!' : 'Copy install command'}</button>
            <a href={ext.marketplaceUrl} target="_blank" rel="noopener noreferrer" style={ghostBtn}>Open in Marketplace</a>
            {ext.repository && <a href={ext.repository} target="_blank" rel="noopener noreferrer" style={ghostBtn}>Repository</a>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 20 }} className="vsx-detail-grid">
        <div>
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #21262d', marginBottom: 16 }}>
            {([['details', 'Details'], ['changelog', 'Changelog'], ['resources', 'Resources']] as const).map(([key, label]) => (
              <button key={key}
                onClick={() => (key === 'changelog' ? loadChangelog() : setTab(key))}
                style={{
                  padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: tab === key ? 600 : 400,
                  color: tab === key ? '#e6edf3' : '#8b949e',
                  borderBottom: `2px solid ${tab === key ? '#58a6ff' : 'transparent'}`,
                }}>{label}</button>
            ))}
          </div>
          {tab === 'resources' ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['Marketplace', ext.marketplaceUrl], ['Repository', ext.repository], ['Homepage', ext.homepage], ['License', ext.license], ['Download VSIX', ext.vsix]]
                .filter(([, href]) => !!href)
                .map(([label, href]) => (
                  <li key={label as string}><a href={href as string} target="_blank" rel="noopener noreferrer" style={{ color: '#58a6ff', fontSize: 13 }}>{label}</a></li>
                ))}
            </ul>
          ) : (
            <div className="vsx-markdown" dangerouslySetInnerHTML={{ __html: html || '<p style="color:#8b949e">No content provided.</p>' }} />
          )}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={panel}>
            <h4 style={panelTitle}>Categories</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ext.categories.map((c) => <span key={c} style={chip}>{c}</span>)}
            </div>
          </div>
          {ext.tags.length > 0 && (
            <div style={panel}>
              <h4 style={panelTitle}>Tags</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ext.tags.slice(0, 24).map((t) => <span key={t} style={chip}>{t}</span>)}
              </div>
            </div>
          )}
          <div style={panel}>
            <h4 style={panelTitle}>More Info</h4>
            {[['Identifier', ext.id], ['Version', ext.version], ['Last updated', fmtDate(ext.lastUpdated)], ['Published', fmtDate(ext.publishedDate)], ['Installs', fmt(ext.installs)]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, padding: '5px 0', borderTop: '1px solid #21262d' }}>
                <span style={{ color: '#8b949e' }}>{k}</span>
                <span style={{ color: '#c9d1d9', textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

/* ------------------------------- main view ------------------------------- */
export const VSCodeMarketplace: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState('installs');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<VSExtension[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 24;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setDebounced(query.trim()); setPage(1); }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort: debounced ? (sort === 'installs' ? 'relevance' : sort) : sort });
    if (debounced) params.set('q', debounced);
    if (category !== 'All') params.set('category', category);
    (async () => {
      try {
        const res = await fetch(`${API}?${params}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) { setError(data.message ?? 'Marketplace unavailable'); setItems([]); return; }
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch {
        if (alive) { setError('Could not reach the Visual Studio Marketplace'); setItems([]); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [debounced, sort, category, page]);

  const pages = Math.max(1, Math.min(50, Math.ceil(total / pageSize)));

  if (selected) return (<><Styles /><Detail id={selected} onBack={() => setSelected(null)} /></>);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Styles />
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e6edf3', margin: 0 }}>VS Code Marketplace</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8b949e' }}>
          Live extensions from the official Visual Studio Marketplace — {total.toLocaleString()} results.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search extensions in Marketplace"
          style={{
            flex: '1 1 260px', minWidth: 200, padding: '9px 12px', background: '#0d1117',
            border: '1px solid #30363d', borderRadius: 8, color: '#c9d1d9', fontSize: 14,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} style={selectStyle}>
          {SORTS.map((s) => <option key={s.id} value={s.id}>Sort by: {s.label}</option>)}
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} style={selectStyle}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <div style={{ padding: 14, border: '1px solid #f8514955', background: '#f8514915', borderRadius: 8, color: '#f85149', fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ height: 108, borderRadius: 10, background: '#161b22', border: '1px solid #21262d', opacity: 0.6 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {items.map((ext) => <Row key={ext.id} ext={ext} onOpen={() => setSelected(ext.id)} />)}
          {items.length === 0 && !error && <div style={{ color: '#8b949e', padding: 40, textAlign: 'center' }}>No extensions found.</div>}
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', padding: '8px 0' }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ ...ghostBtn, opacity: page <= 1 ? 0.4 : 1 }}>Previous</button>
          <span style={{ fontSize: 13, color: '#8b949e' }}>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={{ ...ghostBtn, opacity: page >= pages ? 0.4 : 1 }}>Next</button>
        </div>
      )}
    </div>
  );
};

const Styles = () => (
  <style>{`
    .vsx-markdown { color: #b1bac4; font-size: 14px; line-height: 1.65; overflow-wrap: anywhere; }
    .vsx-markdown h1, .vsx-markdown h2, .vsx-markdown h3, .vsx-markdown h4 { color: #e6edf3; margin: 22px 0 10px; line-height: 1.3; }
    .vsx-markdown h1 { font-size: 22px; border-bottom: 1px solid #21262d; padding-bottom: 8px; }
    .vsx-markdown h2 { font-size: 18px; border-bottom: 1px solid #21262d; padding-bottom: 6px; }
    .vsx-markdown h3 { font-size: 15px; }
    .vsx-markdown p { margin: 10px 0; }
    .vsx-markdown a { color: #58a6ff; text-decoration: none; }
    .vsx-markdown a:hover { text-decoration: underline; }
    .vsx-markdown img { max-width: 100%; border-radius: 6px; }
    .vsx-markdown code { background: #21262d; padding: 2px 5px; border-radius: 4px; font-size: 12.5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .vsx-markdown pre { background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 12px; overflow-x: auto; }
    .vsx-markdown pre code { background: none; padding: 0; }
    .vsx-markdown ul { padding-left: 20px; margin: 10px 0; }
    .vsx-markdown li { margin: 4px 0; }
    .vsx-markdown hr { border: none; border-top: 1px solid #21262d; margin: 18px 0; }
    @media (max-width: 860px) { .vsx-detail-grid { grid-template-columns: minmax(0,1fr) !important; } }
  `}</style>
);

const selectStyle: React.CSSProperties = {
  padding: '9px 10px', background: '#0d1117', border: '1px solid #30363d',
  borderRadius: 8, color: '#c9d1d9', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
};
const primaryBtn: React.CSSProperties = {
  padding: '8px 18px', background: '#1f6feb', border: 'none', borderRadius: 8, color: '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit', display: 'inline-block',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 14px', background: '#21262d', border: '1px solid #30363d', borderRadius: 8,
  color: '#c9d1d9', fontSize: 13, cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit', display: 'inline-block',
};
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: 0,
};
const panel: React.CSSProperties = { background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 14 };
const panelTitle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#8b949e', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const chip: React.CSSProperties = { fontSize: 11, color: '#8b949e', background: '#0d1117', border: '1px solid #21262d', borderRadius: 20, padding: '3px 9px' };

export default VSCodeMarketplace;
