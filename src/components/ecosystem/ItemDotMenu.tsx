import React, { useEffect, useRef, useState } from 'react';
import { EcosystemItem } from '../../lib/ecosystem';
import { IconExternalLink, IconCopy, IconCheck, IconShare, IconGithub, IconCode, IconRocket } from './Icons';

/**
 * Three-dot (⋮) action menu shown on every marketplace item card.
 * The primary "View on Website" action deep-links to the public
 * ZYRAXON AI website product page (https://zyraxonai.lovable.app/ecosystem?item=ID),
 * so clicking any item can be handed over to the website seamlessly.
 */

interface ItemDotMenuProps {
  item: EcosystemItem;
  align?: 'left' | 'right';
}

const WEBSITE_BASE = 'https://zyraxonai.lovable.app/ecosystem';

function websiteItemUrl(item: EcosystemItem): string {
  return `${WEBSITE_BASE}?item=${encodeURIComponent(item.id || item.name)}`;
}

function zyraxonInstallUrl(item: EcosystemItem): string {
  return `zyraxon://install/${encodeURIComponent(item.id || item.name)}`;
}

function launchZyraxon(item: EcosystemItem): void {
  try {
    window.location.href = zyraxonInstallUrl(item);
  } catch {
    // no-op — app not installed
  }
}

export const ItemDotMenu: React.FC<ItemDotMenuProps> = ({ item, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShareOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const copyCommand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = item.id || item.name;
    const cmd = item.installCommand
      ? `Start-Process "${item.installCommand}"`
      : `Start-Process "zyraxon://install/${encodeURIComponent(id)}"`;
    navigator.clipboard?.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(websiteItemUrl(item)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px',
    background: 'none', border: 'none', color: '#c9d1d9', fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit', borderRadius: 8, textAlign: 'left', textDecoration: 'none',
    transition: 'background 0.12s ease',
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); setShareOpen(false); }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, borderRadius: 8, border: '1px solid #30363d',
          background: open ? 'rgba(88,166,255,0.15)' : 'rgba(22,27,34,0.8)',
          color: open ? '#58a6ff' : '#8b949e', cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.15s ease',
        }}
        aria-label="More actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-4 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm8 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 36, right: align === 'right' ? 0 : 'auto', left: align === 'left' ? 0 : 'auto',
          minWidth: 230, background: 'rgba(22,27,34,0.98)', border: '1px solid #30363d',
          borderRadius: 12, padding: 6, zIndex: 70, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)',
        }}>
          <a
            href={websiteItemUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
            style={itemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ color: '#58a6ff', display: 'inline-flex' }}><IconExternalLink size={14} /></span>
            View on Website
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); launchZyraxon(item); setOpen(false); }}
            style={itemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ color: '#8957e5', display: 'inline-flex' }}><IconRocket size={14} /></span>
            Open in ZYRAXON AI
          </button>
          <button
            onClick={copyCommand}
            style={itemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ color: copied ? '#3fb950' : '#8b949e', display: 'inline-flex' }}>
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </span>
            {copied ? 'Copied!' : 'Copy install command'}
          </button>
          <button
            onClick={copyLink}
            style={itemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ color: '#8b949e', display: 'inline-flex' }}><IconShare size={14} /></span>
            Copy website link
          </button>
          {item.githubRepo && (
            <a
              href={item.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ color: '#8b949e', display: 'inline-flex' }}><IconGithub size={14} /></span>
              GitHub Repository
            </a>
          )}
          {item.liveDemo && (
            <a
              href={item.liveDemo}
              target="_blank"
              rel="noopener noreferrer"
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ color: '#8b949e', display: 'inline-flex' }}><IconCode size={14} /></span>
              Live Demo
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemDotMenu;
