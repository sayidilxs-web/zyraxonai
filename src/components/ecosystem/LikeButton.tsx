import React, { useCallback, useEffect, useState } from 'react'
import { getAuthState, getGitHubStorage, getAIConnection } from '../../lib/ecosystem'
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
    const loadLikeState = async () => {
      try {
        const auth = getAuthState()
        if (!auth.isAuthenticated || !auth.user) return

        const storage = getGitHubStorage()
        if (!storage) return

        const userLikes = await storage.get(`likes/${auth.user.id}`)
        if (userLikes && Array.isArray(userLikes)) {
          const isLiked = userLikes.includes(itemId)
          setLiked(isLiked)
        }

        const itemLikes = await storage.get(`item_likes/${itemId}`)
        if (typeof itemLikes === 'number') {
          setLikeCount(itemLikes)
        }
      } catch {}
    }
    loadLikeState()
  }, [itemId])

  const toggleLike = useCallback(async () => {
    const auth = getAuthState()
    if (!auth.isAuthenticated || !auth.user) return

    setAnimating(true)
    setTimeout(() => setAnimating(false), 300)

    const newLiked = !liked
    const newCount = newLiked ? likeCount + 1 : likeCount - 1

    setLiked(newLiked)
    setLikeCount(newCount)
    onLikeChange?.(newLiked, newCount)

    try {
      const storage = getGitHubStorage()
      if (!storage) return

      const userLikes = await storage.get(`likes/${auth.user.id}`)
      const likes = Array.isArray(userLikes) ? userLikes : []

      if (newLiked) {
        if (!likes.includes(itemId)) likes.push(itemId)
      } else {
        const idx = likes.indexOf(itemId)
        if (idx > -1) likes.splice(idx, 1)
      }

      await storage.set(`likes/${auth.user.id}`, likes)
      await storage.set(`item_likes/${itemId}`, newCount)

      try {
        const ai = getAIConnection()
        if (ai && ai.trackEvent) {
          ai.trackEvent('like', {
            userId: auth.user.id,
            itemId,
            liked: newLiked,
            likeCount: newCount,
          })
        }
      } catch {}
    } catch {
      setLiked(liked)
      setLikeCount(likeCount)
    }
  }, [liked, likeCount, itemId, onLikeChange])

  return (
    <button
      onClick={toggleLike}
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
      onMouseEnter={(e) => {
        if (!liked) {
          e.currentTarget.style.borderColor = '#f8514950'
          e.currentTarget.style.color = '#f85149'
        }
      }}
      onMouseLeave={(e) => {
        if (!liked) {
          e.currentTarget.style.borderColor = '#21262d'
          e.currentTarget.style.color = '#8b949e'
        }
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
