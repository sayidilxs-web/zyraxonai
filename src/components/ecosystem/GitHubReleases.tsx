import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommentSection } from './CommentSection';
import { RatingStars } from './RatingStars';
import { LikeButton } from './LikeButton';
import { ShareButton } from './ShareButton';

/**
 * GitHub Releases browser — GLOBAL & DEEP.
 * Every release from the ENTIRE GitHub world (any app, bot, tool,
 * extension) is searchable here by category. Clicking a release opens a
 * rich detail view (like the VS Code extension details page) with the
 * full release notes, every binary asset, one-click source-code
 * download (clone), and the ZYRAXON AI deep link.
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
  repoFullName: string;
  repoUrl: string;
  repoDescription: string | null;
  owner: string;
  ownerAvatar: string | null;
  stars: number;
  language: string | null;
  defaultBranch: string | null;
  cloneUrl: string;
  sourceZipUrl: string;
  branchZipUrl: string;
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
const SUGGESTIONS = ['ai', 'chatgpt', 'vs-code', 'browser', 'bot', 'terminal', 'database', 'editor', 'game', 'python', 'react', 'docker', 'machine-learning', 'api', 'cli', 'web'];

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

/** Render release notes (body) as simple markdown-ish text with code blocks. */
function RenderBody({ body }: { body: string | null }) {
  if (!body) return <p style={{ color: '#8b949e', fontSize: 13.5, fontStyle: 'italic' }}>No release notes provided.</p>;
  const blocks = body.split(/\r?\n{2,}/);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5, lineHeight: 1.6, color: '#c9d1d9', whiteSpace: 'pre-wrap' }}>
      {blocks.map((b, i) => (
        <p key={i} style={{ margin: 0 }}>{b}</p>
      ))}
    </div>
  );
}

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="#e3b341" style={{ flexShrink: 0 }}><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>
);
const DownloadIcon = ({ size = 13, color = '#58a6ff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} style={{ flexShrink: 0 }}><path d="M8 1a.75.75 0 0 1 .75.75v7.44l2.72-2.72a.75.75 0 0 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V1.75A.75.75 0 0 1 8 1zm-4.75 12.5a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5h-9.5z"/></svg>
);
const GitIcon = ({ size = 13, color = '#8b949e' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} style={{ flexShrink: 0 }}><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
);

const ReleaseCard: React.FC<{ r: GitHubReleaseItem; onOpen: (r: GitHubReleaseItem) => void }> = ({ r, onOpen }) => {
  const [copied, setCopied] = useState(false);
  const [copiedSrc, setCopiedSrc] = useState(false);

  const copyCommand = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(`Start-Process "zyraxon://install/release/${r.repoFullName || r.repo}/${r.tagName}"`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const copyClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(`git clone ${r.cloneUrl}`).then(() => {
      setCopiedSrc(true);
      setTimeout(() => setCopiedSrc(false), 1500);
    }).catch(() => {});
  };

  return (
    <div
      onClick={() => onOpen(r)}
      style={{
        background: 'linear-gradient(160deg, rgba(22,27,34,0.95), rgba(13,17,23,0.9))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
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
            {r.ownerAvatar && (
              <img src={r.ownerAvatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f6fc' }}>
              {r.owner ? `${r.owner}/` : ''}<span style={{ color: '#58a6ff' }}>{r.repo}</span>
            </span>
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
        <span style={{ fontSize: 11, color: '#8b949e', whiteSpace: 'nowrap', opacity: 0.75 }}>Details →</span>
      </div>

      <div style={{ fontSize: 12, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {r.stars > 0 && (
          <>
            <StarIcon />
            <span style={{ fontWeight: 600, color: '#c9d1d9' }}>{r.stars >= 1000 ? `${(r.stars / 1000).toFixed(1)}k` : r.stars}</span>
          </>
        )}
        {r.language && (
          <>
            <span style={{ color: '#484f58' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8957e5', display: 'inline-block' }} />
              {r.language}
            </span>
          </>
        )}
        <span style={{ color: '#484f58' }}>·</span>
        <span title={fmtDate(r.publishedAt)}>{timeAgo(r.publishedAt)}</span>
      </div>

      {r.repoDescription && (
        <p style={{
          margin: 0, fontSize: 12.5, color: '#8b949e', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{r.repoDescription}</p>
      )}

      {r.assets.length > 0 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#3fb950', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <DownloadIcon size={12} color="#3fb950" /> {r.assets.length} asset{r.assets.length > 1 ? 's' : ''}
          </span>
          {r.assets[0] && (
            <span style={{ fontSize: 11, color: '#8b949e' }}>
              {r.assets[0].name} · {fmtSize(r.assets[0].size)}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(r); }}
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
          View Details
        </button>
        <button
          onClick={copyClone}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            background: 'rgba(46,160,67,0.15)', border: '1px solid rgba(46,160,67,0.45)', borderRadius: 10,
            color: copiedSrc ? '#3fb950' : '#3fb950', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <GitIcon size={13} color={copiedSrc ? '#3fb950' : '#3fb950'} />
          {copiedSrc ? '✓ Clone copied' : 'Clone'}
        </button>
        <button onClick={copyCommand}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            background: 'rgba(22,27,34,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
            color: copied ? '#3fb950' : '#8b949e', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          {copied ? '✓ Copied' : 'Copy cmd'}
        </button>
        <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            background: 'rgba(22,27,34,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
            color: '#8b949e', fontSize: 12.5, textDecoration: 'none', fontFamily: 'inherit', marginLeft: 'auto',
          }}>
          GitHub
        </a>
      </div>
    </div>
  );
};

/* ─────────────── Detail view (like VS Code extension details) ─────────────── */

const ReleaseDetail: React.FC<{ r: GitHubReleaseItem | null; onClose: () => void }> = ({ r, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [copiedSrc, setCopiedSrc] = useState(false);
  const [openInApp, setOpenInApp] = useState(false);

  useEffect(() => {
    if (!r) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [r, onClose]);

  if (!r) return null;

  const copyInstall = () => {
    navigator.clipboard?.writeText(`Start-Process "zyraxon://install/release/${r.repoFullName}/${r.tagName}"`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };
  const copyClone = () => {
    navigator.clipboard?.writeText(`git clone ${r.cloneUrl}`).then(() => {
      setCopiedSrc(true); setTimeout(() => setCopiedSrc(false), 1500);
    }).catch(() => {});
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(1,4,9,0.82)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '32px 16px',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 860, background: 'linear-gradient(170deg,#161b22,#0d1117)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,0.6)', overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'radial-gradient(circle at 20% 0%, rgba(137,87,229,0.18), transparent 55%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {r.ownerAvatar && <img src={r.ownerAvatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)' }} />}
                <a href={r.repoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 700, color: '#f0f6fc', textDecoration: 'none' }}>
                  {r.owner ? `${r.owner}/` : ''}<span style={{ color: '#58a6ff' }}>{r.repo}</span>
                </a>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: r.prerelease ? 'rgba(240,136,62,0.15)' : 'rgba(63,185,80,0.15)',
                  border: `1px solid ${r.prerelease ? 'rgba(240,136,62,0.4)' : 'rgba(63,185,80,0.4)'}`,
                  color: r.prerelease ? '#f0883e' : '#3fb950', textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>{r.prerelease ? 'Pre-release' : 'Release'}</span>
              </div>
              <h2 style={{ margin: '12px 0 4px', fontSize: 24, fontWeight: 800, color: '#f0f6fc', lineHeight: 1.2 }}>
                {r.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', color: '#8b949e', fontSize: 12.5 }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', color: '#e3b341' }}>{r.tagName}</span>
                <span>·</span>
                <span title={fmtDate(r.publishedAt)}>Released {timeAgo(r.publishedAt)}</span>
                {r.stars > 0 && (<><span>·</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><StarIcon /> {r.stars.toLocaleString()}</span></>)}
                {r.language && (<><span>·</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#8957e5', display: 'inline-block' }} />{r.language}</span></>)}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(22,27,34,0.9)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#8b949e',
              width: 34, height: 34, cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0,
            }} onMouseEnter={(e) => (e.currentTarget.style.color = '#f0f6fc')} onMouseLeave={(e) => (e.currentTarget.style.color = '#8b949e')}>
              ✕
            </button>
          </div>
          {r.repoDescription && <p style={{ margin: '12px 0 0', color: '#8b949e', fontSize: 13.5, lineHeight: 1.5 }}>{r.repoDescription}</p>}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setOpenInApp(true); launchZyraxon(r.zyraxonUrl); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: 'none', borderRadius: 11,
                background: 'linear-gradient(135deg,#8957e5,#6f42c1)', color: '#fff', fontSize: 13.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(137,87,229,0.4)',
              }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5h-5.5a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1z"/></svg>
              {openInApp ? 'Opening ZYRAXON AI…' : 'Open in ZYRAXON AI'}
            </button>
            {r.downloadUrl ? (
              <a href={r.downloadUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: 'none', borderRadius: 11,
                background: 'linear-gradient(135deg,#238636,#1f7a37)', color: '#fff', fontSize: 13.5, fontWeight: 700,
                textDecoration: 'none', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(35,134,54,0.35)',
              }}>
                <DownloadIcon size={15} color="#fff" /> Download Asset
              </a>
            ) : (
              <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: 'none', borderRadius: 11,
                background: 'linear-gradient(135deg,#238636,#1f7a37)', color: '#fff', fontSize: 13.5, fontWeight: 700,
                textDecoration: 'none', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(35,134,54,0.35)',
              }}>
                <DownloadIcon size={15} color="#fff" /> View on GitHub
              </a>
            )}
            <button onClick={copyInstall} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 11,
              background: 'rgba(22,27,34,0.9)', border: '1px solid rgba(255,255,255,0.12)', color: copied ? '#3fb950' : '#8b949e',
              fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {copied ? '✓ Copied' : 'Copy cmd'}
            </button>
            <button onClick={copyClone} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 11,
              background: 'rgba(46,160,67,0.12)', border: '1px solid rgba(46,160,67,0.45)', color: '#3fb950',
              fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <GitIcon size={13} color="#3fb950" /> {copiedSrc ? '✓ Clone copied' : 'Copy git clone'}
            </button>
          </div>

          {/* Source code download */}
          <div style={{ background: 'rgba(13,17,23,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <GitIcon size={16} color="#58a6ff" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>Source code</span>
              <span style={{ fontSize: 11.5, color: '#8b949e' }}>— download this exact release's source or the latest branch</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={r.sourceZipUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9,
                background: 'rgba(56,139,253,0.15)', border: '1px solid rgba(56,139,253,0.45)', color: '#58a6ff',
                fontSize: 12, textDecoration: 'none', fontFamily: 'inherit', fontWeight: 600,
              }}>
                <DownloadIcon size={12} color="#58a6ff" /> Download release source (.zip)
              </a>
              <a href={r.branchZipUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9,
                background: 'rgba(22,27,34,0.9)', border: '1px solid rgba(255,255,255,0.12)', color: '#c9d1d9',
                fontSize: 12, textDecoration: 'none', fontFamily: 'inherit',
              }}>
                <DownloadIcon size={12} color="#c9d1d9" /> Latest {r.defaultBranch || 'main'} (.zip)
              </a>
              <code style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9,
                background: 'rgba(13,17,23,0.9)', border: '1px solid rgba(255,255,255,0.12)', color: '#8b949e',
                fontSize: 11.5, fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>git clone {r.cloneUrl}</code>
            </div>
          </div>

          {/* Release notes */}
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Release notes
            </h3>
            <RenderBody body={r.body} />
          </div>

          {/* Assets */}
          {r.assets.length > 0 ? (
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Downloads ({r.assets.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {r.assets.map((a) => (
                  <a key={a.name} href={a.downloadUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(13,17,23,0.8)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, textDecoration: 'none', color: '#c9d1d9', fontSize: 13,
                    transition: 'border-color 0.15s ease, background 0.15s ease',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff'; e.currentTarget.style.background = 'rgba(56,139,253,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = 'rgba(13,17,23,0.8)'; }}
                  >
                    <DownloadIcon size={15} color="#58a6ff" />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{a.name}</span>
                    <span style={{ fontSize: 11.5, color: '#8b949e' }}>{fmtSize(a.size)}</span>
                    {a.downloadCount > 0 && <span style={{ fontSize: 11.5, color: '#3fb950' }}>{a.downloadCount.toLocaleString()}↓</span>}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: '#484f58' }}>No binary assets in this release — use the source downloads above.</div>
          )}

          {/* Footer links */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, alignItems: 'center' }}>
            <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9,
              background: 'rgba(22,27,34,0.9)', border: '1px solid rgba(255,255,255,0.12)', color: '#8b949e', fontSize: 12, textDecoration: 'none', fontFamily: 'inherit',
            }}><GitIcon size={13} /> View on GitHub</a>
            <a href={r.repoUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9,
              background: 'rgba(22,27,34,0.9)', border: '1px solid rgba(255,255,255,0.12)', color: '#8b949e', fontSize: 12, textDecoration: 'none', fontFamily: 'inherit',
            }}>Repository</a>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShareButton itemId={`github-release-${r.id}`} itemName={r.name} itemUrl={`https://zyraxonai.lovable.app/ecosystem?item=${encodeURIComponent(r.repo)}`} />
              <LikeButton itemId={`github-release-${r.id}`} initialLikeCount={0} />
            </div>
          </div>

          {/* Rating */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rating</h3>
            <RatingStars itemId={`github-release-${r.id}`} initialAverage={0} />
          </div>

          {/* Comments */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comments</h3>
            <CommentSection itemId={`github-release-${r.id}`} comments={[]} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────── Main browser ─────────────── */

export const GitHubReleases: React.FC<GitHubReleasesProps> = ({ compact = false }) => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<GitHubReleaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [depth, setDepth] = useState(30);
  const [selected, setSelected] = useState<GitHubReleaseItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const perPage = 60;

  const fetchPage = useCallback(async (d: number) => {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ perPage: String(perPage), depth: String(d), perRepo: '10' });
    if (debounced) params.set('q', debounced);
    try {
      const res = await fetch(`${API}?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Releases unavailable'); setItems([]); return; }
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
    } catch {
      setError('Could not reach GitHub releases'); setItems([]);
    } finally { setLoading(false); }
  }, [debounced]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(query.trim()), 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  useEffect(() => {
    setDepth(30);
    fetchPage(30);
    return () => { /* noop */ };
  }, [fetchPage]);

  const loadMore = () => {
    const next = Math.min(100, depth + 10);
    setDepth(next);
    fetchPage(next);
  };

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
              placeholder="Search releases across ALL of GitHub — try a category…"
              style={{
                width: '100%', padding: '9px 12px 9px 36px', background: 'rgba(13,17,23,0.9)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#c9d1d9', fontSize: 14,
                fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#f0883e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(240,136,62,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <span style={{ fontSize: 12.5, color: '#8b949e' }}>{total.toLocaleString()} release{total !== 1 ? 's' : ''} found</span>
        </div>
      )}

      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#484f58' }}>Trending:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              style={{
                padding: '4px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                background: query === s ? 'rgba(240,136,62,0.18)' : 'rgba(22,27,34,0.9)',
                border: `1px solid ${query === s ? 'rgba(240,136,62,0.55)' : '#30363d'}`,
                color: query === s ? '#f0883e' : '#8b949e',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { if (query !== s) { e.currentTarget.style.borderColor = '#f0883e66'; e.currentTarget.style.color = '#f0f6fc'; } }}
              onMouseLeave={(e) => { if (query !== s) { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e'; } }}
            >
              {s}
            </button>
          ))}
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
            <div key={i} style={{ height: 210, borderRadius: 14, background: 'rgba(22,27,34,0.7)', border: '1px solid rgba(255,255,255,0.08)', opacity: 0.5, animation: `zxrPulse 1.4s ease-in-out ${i * 0.12}s infinite` }} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px', background: 'rgba(22,27,34,0.7)',
          borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', color: '#8b949e', fontSize: 14,
        }}>
          No releases found{debounced ? ` for “${debounced}”` : ''}. Try another category or check the spelling.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {shown.map((r) => <ReleaseCard key={`${r.repoFullName}-${r.tagName}-${r.id}`} r={r} onOpen={setSelected} />)}
        </div>
      )}

      {!compact && hasMore && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={loadMore} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 11,
            background: 'rgba(22,27,34,0.9)', border: '1px solid rgba(255,255,255,0.12)', color: '#c9d1d9', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8957e5'; e.currentTarget.style.background = 'rgba(137,87,229,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = 'rgba(22,27,34,0.9)'; }}
          >
            Load more releases ({Math.min(depth + 10, 100)}/100 repos depth)
          </button>
        </div>
      )}

      {compact && items.length > 4 && (
        <div style={{ fontSize: 12.5, color: '#58a6ff', textAlign: 'center' }}>
          Showing the latest {Math.min(4, items.length)} of {total} releases — browse all to search, download & clone.
        </div>
      )}

      <ReleaseDetail r={selected} onClose={() => setSelected(null)} />

      <style>{`@keyframes zxrPulse { 0%,100% { opacity: .4 } 50% { opacity: .8 } }`}</style>
    </div>
  );
};

export default GitHubReleases;
