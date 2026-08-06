import React, { useCallback, useEffect, useState } from 'react';
import { getAuthState } from '../../lib/ecosystem';
import { toggleLike, getLikeCount, getUserLikes } from '../../lib/shared-data';

interface LikeButtonProps {
  itemId: string;
  initialLikeCount: number;
  initialLiked?: boolean;
  onLikeChange?: (liked: boolean, count: number) => void;
}

const Heart = ({ filled, size = 16 }: { filled: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#f85149' : 'none'}
    stroke={filled ? '#f85149' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const LikeButton: React.FC<LikeButtonProps> = ({ itemId, initialLikeCount, initialLiked = false, onLikeChange }) => {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const count = await getLikeCount(itemId);
        setLikeCount(count);
        const auth = getAuthState();
        if (auth.isAuthenticated && auth.user) {
          const userLikes = await getUserLikes(auth.user.id);
          setLiked(userLikes.includes(itemId));
        }
      } catch {}
    })();
  }, [itemId]);

  const handleClick = useCallback(async () => {
    const auth = getAuthState();
    if (!auth.isAuthenticated || !auth.user) return;
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    const prevLiked = liked;
    const prevCount = likeCount;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(newLiked ? likeCount + 1 : Math.max(0, likeCount - 1));
    onLikeChange?.(newLiked, newLiked ? likeCount + 1 : Math.max(0, likeCount - 1));
    try {
      const result = await toggleLike(itemId, auth.user.id);
      setLiked(result.liked);
      setLikeCount(result.count);
      onLikeChange?.(result.liked, result.count);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  }, [liked, likeCount, itemId, onLikeChange]);

  return (
    <button onClick={handleClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
      background: liked ? 'rgba(248, 81, 73, 0.1)' : 'transparent',
      border: `1px solid ${liked ? '#f8514950' : '#21262d'}`,
      borderRadius: '8px', color: liked ? '#f85149' : '#8b949e',
      cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: 'inherit',
      transition: 'all 0.2s ease', outline: 'none',
    }}>
      <span style={{ transition: 'transform 0.2s ease', transform: animating ? 'scale(1.3)' : 'scale(1)', display: 'flex' }}>
        <Heart filled={liked} />
      </span>
      <span>{likeCount}</span>
    </button>
  );
};