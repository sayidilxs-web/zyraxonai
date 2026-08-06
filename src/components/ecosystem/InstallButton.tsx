import React, { useEffect, useRef, useState } from 'react';
import {
  getRecord, install, isInstalled, setEnabled, subscribe, uninstall,
  type InstalledRecord, type InstallTarget,
} from '@/lib/marketplace-install';

/**
 * VS Code-parity install control: a primary action plus a gear menu
 * with Disable / Enable / Uninstall. State is mirrored locally so the
 * UI reacts instantly, while the real action is handed to the ZYRAXON
 * desktop app over its bridge or `zyraxon://` deep link.
 */
export const InstallButton: React.FC<{ target: InstallTarget; size?: 'sm' | 'md' }> = ({ target, size = 'sm' }) => {
  const [record, setRecord] = useState<InstalledRecord | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecord(getRecord(target.id));
    return subscribe((all) => setRecord(all[target.id]));
  }, [target.id]);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menu]);

  const pad = size === 'md' ? '8px 18px' : '5px 12px';
  const font = size === 'md' ? 13 : 12;

  const base: React.CSSProperties = {
    padding: pad, fontSize: font, fontWeight: 600, borderRadius: 8, cursor: busy ? 'wait' : 'pointer',
    fontFamily: 'inherit', border: '1px solid transparent', whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  };

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const menuItem: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none',
    border: 'none', color: '#c9d1d9', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 6,
  };

  return (
    <div ref={wrap} style={{ position: 'relative', display: 'inline-flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
      {!record ? (
        <button
          disabled={busy}
          onClick={() => act(() => install(target).then(() => undefined))}
          style={{
            ...base,
            background: 'linear-gradient(135deg, #8957e5, #6f42c1)', color: '#fff',
            boxShadow: '0 3px 14px rgba(137,87,229,0.35)',
          }}
        >{busy ? 'Installing…' : 'Install'}</button>
      ) : (
        <>
          <button
            onClick={() => setMenu((m) => !m)}
            style={{
              ...base,
              background: 'rgba(63,185,80,0.12)',
              border: '1px solid rgba(63,185,80,0.45)',
              color: record.enabled ? '#3fb950' : '#8b949e',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
            </svg>
            {record.enabled ? 'Installed' : 'Disabled'}
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4z" /></svg>
          </button>
          {menu && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, minWidth: 180, zIndex: 70, padding: 5,
              background: 'rgba(22,27,34,0.98)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)',
            }}>
              <button style={menuItem}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                onClick={() => { setMenu(false); void act(() => setEnabled(target.id, !record.enabled)); }}>
                {record.enabled ? 'Disable' : 'Enable'}
              </button>
              <button style={menuItem}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                onClick={() => { setMenu(false); void act(() => install(target).then(() => undefined)); }}>
                Reinstall / Update
              </button>
              <button style={{ ...menuItem, color: '#f85149' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                onClick={() => { setMenu(false); void act(() => uninstall(target.id)); }}>
                Uninstall
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export { isInstalled };
export default InstallButton;
