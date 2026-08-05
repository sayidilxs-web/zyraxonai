import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * GitHub Releases browser for the ZYRAXON AI ecosystem.
 * Every release across the ZYRAXON GitHub repos is surfaced here,
 * searchable by name/repo/tag, with direct download buttons and
 * one-click "Open in ZYRAXON AI" deep links.
 */

export interface GitHubAsset {
  name: string;
  size: number;
  downloadUrl: string;
  downloadCount: number;
}

export interface GitHubReleaseItem {
  id: number;
  repo: string;
  repoUrl: string;
  repoDescription: string | null;
  tagName: string;
  name: string;
  htmlUrl: string;
  publishedAt: string;
  prerelease: boolean;
  draft: boolean;
  body: string | null;
  assets: GitHubAsset[];
  downloadUrl: string | null;
  websiteUrl: string;
  zyraxonUrl: string;
}

interface GitHubReleasesProps {
  compact?: boolean;
}

const API = '/api/public/github-releases';
const ZYRAXON_SCHEME = 'zyraxon://';

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  } catch {
    return '';
  }
}

function launchZyraxon(url: string): void {
  try {
    window.location.href = url;
  } catch {
    // no-op — app not installed
  }
}

const ReleaseCard: React.FC<{ r: GitHubReleaseItem }> = ({ r }) => {
  const [copied, setCopied] = useState(false);

  const copyCommand = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(`Start-Process "zyraxon://install/release/${r.repo}/${r.tagName}"`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <div style={{
      background: 'linear-gradient(160deg, rgba(22,27,34,0.95), rgba(13,17,23,0.9))',
      border: '1px solid #21262d',
      borderRadius: 14,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(240,136,62,0.55)';
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 12px 34px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#21262d';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a href={r.repoUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 600, color: '#f0f6fc', textDecoration: 'none' }}>
              {r.repo}
            </a>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: r.prerelease ? 'rgba(240,136,62,0.15)' : 'rgba(63,185,80,0.15)',
              border: `1px solid ${r.prerelease ? 'rgba(240,136,62,0.4)' : 'rgba(63,185,80,0.4)'}`,
              color: r.prerelease ? '#f0883e' : '#3fb950',
              textTransform: 'uppercase', letterSpacing: '0.4px',
            }}>
              {r.prerelease ? 'Pre-release' : 'Release'}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: '#e6edf3', lineHeight: 1.3 }}>
            {r.name}
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: '#8b949e', fontFamily: 'ui-monospace, monospace' }}>
              {r.tagName}
            </span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
        <span style={{ fontWeight: 600, color: '#c9d1d9' }}>{r.repo}</span>
        <span>·</span>
        <span title={fmtDate(r.publishedAt)}>{timeAgo(r.publishedAt)}</span>
      </div>

      {r.repoDescription && (
        <p style={{
          margin: 0, fontSize: 12.5, color: '#8b949e', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{r.repoDescription}</p>
      )}

      {r.assets.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
          {r.assets.slice(0, 3).map((a) => (
            <a
              key={a.name}
              href={a.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: 'rgba(13,17,23,0.8)', border: '1px solid #30363d', borderRadius: 10,
                textDecoration: 'none', color: '#c9d1d9', fontSize: 12.5, transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff'; e.currentTarget.style.background = 'rgba(56,139,253,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = 'rgba(13,17,23,0.8)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#58a6ff" style={{ flexShrink: 0 }}>
                <path d="M8 1a.75.75 0 0 1 .75.75v7.44l2.72-2.72a.75.75 0 0 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V1.75A.75.75 0 0 1 8 1zm-4.75 12.5a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5h-9.5z"/>
              </svg>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <span style={{ fontSize: 11, color: '#8b949e', flexShrink: 0 }}>{fmtSize(a.size)}</span>
            </a>
          ))}
          {r.assets.length > 3 && (
            <span style={{ fontSize: 11, color: '#484f58', textAlign: 'center' }}>
              +{r.assets.length - 3} more asset{r.assets.length - 3 > 1 ? 's' : ''} on GitHub
            </span>
          )}
        </div>
      ) : (
        <div style={{ padding: '8px 0', fontSize: 12, color: '#484f58' }}>
          No binary assets — source only.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
        <button
          onClick={() => launchZyraxon(r.zyraxonUrl)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            background: 'linear-gradient(135deg,#8957e5,#6f42c1)', border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(137,87,229,0.35)', transition: 'transform 0.12s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5h-5.5a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1z"/></svg>
          Open in ZYRAXON AI
        </button>
        <a href={r.websiteUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            background: 'rgba(22,27,34,0.8)', border: '1px solid #30363d', borderRadius: 10,
            color: '#c9d1d9', fontSize: 12.5, textDecoration: 'none', fontFamily: 'inherit',
          }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="#58a6ff"><path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 2z"/></svg>
          Website
        </a>
        <button onClick={copyCommand}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            background: 'rgba(22,27,34,0.8)', border: '1px solid #30363d', borderRadius: 10,
            color: copied ? '#3fb950' : '#8b949e', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          {copied ? '✓ Copied' : 'Copy cmd'}
        </button>
        <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            background: 'rgba(22,27,34,0.8)', border: '1px solid #30363d', borderRadius: 10,
            color: '#8b949e', fontSize: 12.5, textDecoration: 'none', fontFamily: 'inherit', marginLeft: 'auto',
          }}>
          GitHub
        </a>
      </div>
    </div>
  );
};

export const GitHubReleases: React.FC<GitHubReleasesProps> = ({ compact = false }) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<GitHubReleaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(query.trim()), 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    const params = new URLSearchParams({ perPage: '24' });
    if (debounced) params.set('q', debounced);
    (async () => {
      try {
        const res = await fetch(`${API}?${params}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) { setError(data.message ?? 'Releases unavailable'); setItems([]); return; }
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch {
        if (alive) { setError('Could not reach GitHub releases'); setItems([]); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [debounced]);

  const shown = useMemo(() => (compact ? items.slice(0, 4) : items), [compact, items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!compact && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 220, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8b949e', display: 'inline-flex' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M10.68 11.74a6 6 0 1 1 .357-.357l3.786 3.786a.75.75 0 1 1-1.06 1.06l-3.083-3.083zM11.5 7a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0z"/></svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search releases by name, repo, tag…"
              style={{
                width: '100%', padding: '9px 12px 9px 36px', background: 'rgba(13,17,23,0.9)',
                border: '1px solid #30363d', borderRadius: 10, color: '#c9d1d9', fontSize: 14,
                fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#f0883e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(240,136,62,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <span style={{ fontSize: 12.5, color: '#8b949e' }}>{total.toLocaleString()} release{total !== 1 ? 's' : ''}</span>
        </div>
      )}

      {error && (
        <div style={{ padding: 12, border: '1px solid #f8514955', background: '#f8514915', borderRadius: 10, color: '#f85149', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
            <div key={i} style={{ height: 210, borderRadius: 14, background: 'rgba(22,27,34,0.7)', border: '1px solid #21262d', opacity: 0.5, animation: `zxrPulse 1.4s ease-in-out ${i * 0.12}s infinite` }} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px', background: 'rgba(22,27,34,0.7)',
          borderRadius: 14, border: '1px solid #21262d', color: '#8b949e', fontSize: 14,
        }}>
          No releases found{debounced ? ` for “${debounced}”` : ''}.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {shown.map((r) => <ReleaseCard key={`${r.repo}-${r.tagName}-${r.id}`} r={r} />)}
        </div>
      )}

      {compact && items.length > 4 && (
        <div style={{ fontSize: 12.5, color: '#58a6ff', textAlign: 'center' }}>
          Showing the latest {Math.min(4, items.length)} of {total} releases — browse all to search & download more.
        </div>
      )}

      <style>{`@keyframes zxrPulse { 0%,100% { opacity: .4 } 50% { opacity: .8 } }`}</style>
    </div>
  );
};

export default GitHubReleases;
