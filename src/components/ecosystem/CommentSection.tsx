import React, { useCallback, useEffect, useState } from 'react'
import { getAuthState } from '../../lib/ecosystem'
import { getComments, addComment, type SharedComment } from '../../lib/shared-data'
import { IconSend, IconHeart, IconHeartOutline } from './Icons'

interface CommentSectionProps {
  itemId: string
  comments: any[]
  onCommentAdded?: (comment: any) => void
}

const formatTimeAgo = (dateString: string): string => {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  itemId,
  comments: initialComments,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<any[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await getComments(itemId)
        if (stored.length > 0) setComments(stored)
      } catch {}
    }
    load()
  }, [itemId])

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  const handleSubmit = useCallback(async () => {
    const content = newComment.trim()
    if (!content) return

    const auth = getAuthState()
    if (!auth.isAuthenticated || !auth.user) return

    setSubmitting(true)
    try {
      const comment: SharedComment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        itemId,
        userId: auth.user.id,
        username: auth.user.username,
        avatarUrl: auth.user.avatarUrl,
        content,
        createdAt: new Date().toISOString(),
        likeCount: 0,
      }

      await addComment(comment)
      setComments((prev) => [comment, ...prev])
      setNewComment('')
      onCommentAdded?.(comment)
    } catch (err) {
      console.error('Comment failed:', err)
    } finally {
      setSubmitting(false)
    }
  }, [newComment, itemId, onCommentAdded])

  const auth = getAuthState()

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#c9d1d9', marginBottom: 16 }}>
        Comments ({comments.length})
      </h3>

      {auth.isAuthenticated && auth.user ? (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <img
            src={auth.user.avatarUrl || `https://github.com/${auth.user.username}.png`}
            alt=""
            style={{ width: 36, height: 36, borderRadius: '50%', background: '#21262d' }}
          />
          <div style={{ flex: 1 }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              style={{
                width: '100%',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#c9d1d9',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#30363d' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || !newComment.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  background: newComment.trim() ? '#238636' : '#21262d',
                  border: 'none',
                  borderRadius: 6,
                  color: newComment.trim() ? '#fff' : '#8b949e',
                  cursor: newComment.trim() ? 'pointer' : 'default',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                <IconSend size={14} />
                {submitting ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 16 }}>Sign in to leave a comment</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {comments.length === 0 ? (
          <p style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            No comments yet. Be the first!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} style={{ display: 'flex', gap: 12 }}>
              <img
                src={comment.avatarUrl || `https://github.com/${comment.username}.png`}
                alt=""
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#21262d', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9' }}>{comment.username}</span>
                  <span style={{ fontSize: 11, color: '#8b949e' }}>{formatTimeAgo(comment.createdAt)}</span>
                </div>
                <p style={{ fontSize: 14, color: '#b1bac4', lineHeight: 1.5, margin: 0 }}>{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
