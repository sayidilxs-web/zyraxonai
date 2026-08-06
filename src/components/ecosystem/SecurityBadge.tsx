import React, { useState } from 'react';
import { scanItem, type SecurityInput } from '@/lib/marketplace-security';

/** Transparent, click-to-expand trust badge shown on every marketplace item. */
export const SecurityBadge: React.FC<{ input: SecurityInput; detailed?: boolean }> = ({ input, detailed = false }) => {
  const [open, setOpen] = useState(detailed);
  const r = scanItem(input);

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={`Security score ${r.score}/100`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20,
          background: `${r.color}15`, border: `1px solid ${r.color}40`, color: r.color,
          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.15s ease',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0l6 2.5v5c0 3.6-2.5 6.9-6 8.5-3.5-1.6-6-4.9-6-8.5v-5L8 0z" />
        </svg>
        {r.label} · {r.score}
        <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: 2, opacity: 0.7 }}>
          <path d="M4 6l4 4 4-4z" />
        </svg>
      </button>

      {open && (
        <div style={{
          marginTop: 8, padding: 12, borderRadius: 12, background: 'rgba(13,17,23,0.85)',
          border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', maxWidth: 340,
        }}>
          <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ width: `${r.score}%`, height: '100%', background: r.color }} />
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {r.signals.map((s) => (
              <li key={s.text} style={{ fontSize: 11.5, color: s.ok ? '#b1bac4' : '#8b949e', display: 'flex', gap: 6 }}>
                <span style={{ color: s.ok ? '#3fb950' : '#d29922' }}>{s.ok ? '✓' : '!'}</span>{s.text}
              </li>
            ))}
          </ul>
          {r.permissions.length > 0 && (
            <>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8b949e', margin: '10px 0 6px' }}>
                Requested capabilities
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {r.permissions.map((p) => (
                  <span key={p} style={{
                    fontSize: 10.5, color: '#c9d1d9', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 8px',
                  }}>{p}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityBadge;
