import React, { useCallback, useEffect, useState } from 'react';
import { getAuthState } from '../../lib/ecosystem';
import { getRating, setRating } from '../../lib/shared-data';

interface RatingStarsProps {
  itemId: string;
  initialAverage?: number;
  onRated?: (average: number, count: number) => void;
}

const Star = ({ filled, size = 20 }: { filled: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#e3b341' : 'none'}
    stroke={filled ? '#e3b341' : '#484f58'} strokeWidth="1.6" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const RatingStars: React.FC<RatingStarsProps> = ({ itemId, initialAverage = 0, onRated }) => {
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(0);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const auth = getAuthState();
  const userId = auth.isAuthenticated && auth.user ? auth.user.id : null;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await getRating(itemId, userId ?? undefined);
        if (!alive) return;
        setAverage(r.average || initialAverage);
        setCount(r.count);
        setMine(r.userRating);
      } catch { /* keep initial */ }
    })();
    return () => { alive = false; };
  }, [itemId, userId, initialAverage]);

  const submit = useCallback(async (value: number) => {
    if (!userId) { setStatus('Sign in to rate'); return; }
    const prev = mine;
    setMine(value);
    setSaving(true);
    setStatus(null);
    try {
      const res = await setRating(itemId, userId, value);
      setAverage(res.average);
      setCount(res.count);
      setStatus('Thanks for rating!');
      onRated?.(res.average, res.count);
    } catch {
      setMine(prev);
      setStatus('Could not save rating');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 2500);
    }
  }, [itemId, userId, mine, onRated]);

  const display = hover || mine || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 2 }} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
              disabled={saving}
              onMouseEnter={() => setHover(i)}
              onClick={() => submit(i)}
              style={{
                background: 'none', border: 'none', padding: 0, lineHeight: 0,
                cursor: saving ? 'wait' : 'pointer', outline: 'none',
                transform: hover === i ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.12s ease',
              }}
            >
              <Star filled={i <= (display || Math.round(average))} />
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: '#c9d1d9', fontWeight: 600 }}>{(average || 0).toFixed(1)}</span>
        <span style={{ fontSize: 12, color: '#8b949e' }}>({count})</span>
      </div>
      <span style={{ fontSize: 11, color: status ? '#58a6ff' : '#484f58', minHeight: 14 }}>
        {status ?? (mine ? `Your rating: ${mine}★` : userId ? 'Click a star to rate' : 'Sign in to rate')}
      </span>
    </div>
  );
};

export default RatingStars;
