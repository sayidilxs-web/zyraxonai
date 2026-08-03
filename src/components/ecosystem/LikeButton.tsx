import React, { useCallback, useEffect, useState } from 'react'
import { getAuthState } from '../../lib/ecosystem'
import { toggleLike, getLikeCount, getUserLikes } from '../../lib/shared-data'
import { IconHeart, IconHeartOutline } from './Icons'

interface LikeButtonProps {
  itemId: string
  initialLikeCount: number
  initialLiked?: boolean
  onLikeChange?: (liked: boolean, count: number) => void
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  itemId,
  initialLikeCount,
  initialLiked = false,
  onLikeChange,
}) => {
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const auth = getAuthState()
        const count = await getLikeCount(itemId)
        setLikeCount(count)
        if (auth.isAuthenticated && auth.user) {
          const userLikes = await getUserLikes(auth.user.id)
          setLiked(userLikes.includes(itemId))
        }
      } catch {}
    }
    load()
  }, [itemId])

  const toggleLikeHandler = useCallback(async () => {
    const auth = getAuthState()
    if (!auth.isAuthenticated || !auth.user) return

    setAnimating(true)
    setTimeout(() => setAnimating(false), 300)

    const prevLiked = liked
    const prevCount = likeCount
    const newLiked = !liked
    const newCount = newLiked ? likeCount + 1 : likeCount - 1

    setLiked(newLiked)
    setLikeCount(newCount)
    onLikeChange?.(newLiked, newCount)

    try {
      const result = await toggleLike(itemId, auth.user.id)
      setLiked(result.liked)
      setLikeCount(result.count)
      onLikeChange?.(result.liked, result.count)
    } catch {
      setLiked(prevLiked)
      setLikeCount(prevCount)
    }
  }, [liked, likeCount, itemId, onLikeChange])

  return (
    <button
      onClick={toggleLikeHandler}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: liked ? 'rgba(248, 81, 73, 0.1)' : 'transparent',
        border: `1px solid ${liked ? '#f8514950' : '#21262d'}`,
        borderRadius: '8px',
        color: liked ? '#f85149' : '#8b949e',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
        outline: 'none',
      }}
    >
      <span style={{
        transition: 'transform 0.2s ease',
        transform: animating ? 'scale(1.3)' : 'scale(1)',
        display: 'flex',
      }}>
        {liked ? <IconHeart size={16} /> : <IconHeartOutline size={16} />}
      </span>
      <span>{likeCount}</span>
    </button>
  )
}
