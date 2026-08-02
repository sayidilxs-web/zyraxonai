import React, { useCallback, useEffect, useState } from 'react'
import { getAuthState, getGitHubStorage, getAIConnection } from '../../lib/ecosystem'
import { IconSend, IconHeart, IconHeartOutline } from './Icons'
import type { Comment } from '../../lib/ecosystem'

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
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(months / 12)
  return `${years}y ago`
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
    setComments(initialComments)
  }, [initialComments])

  const handleSubmit = useCallback(async () => {
    const content = newComment.trim()
    if (!content) return

    const auth = getAuthState()
    if (!auth.isAuthenticated || !auth.user) return

    setSubmitting(true)
    try {
      const storage = getGitHubStorage()
      if (!storage) return

      const comment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: auth.user.id,
        username: auth.user.username,
        avatarUrl: auth.user.avatarUrl,
        content,
        itemId,
        createdAt: new Date().toISOString(),
        likeCount: 0,
      }

      await storage.addComment(itemId, comment)
      setComments((prev) => [comment, ...prev])
      setNewComment('')

      onCommentAdded?.(comment)

      try {
        const ai = getAIConnection()
        if (ai && ai.trackEvent) {
          ai.trackEvent('comment', {
            userId: auth.user.id,
            itemId,
            commentId: comment.id,
          })
        }
      } catch {}
    } catch {}
    setSubmitting(false)
  }, [newComment, itemId, onCommentAdded])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    background: '#0d1117',
    border: '1px solid #21262d',
    borderRadius: '8px',
    color: '#c9d1d9',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    lineHeight: '1.5',
  }

  return (
    <div>
      <div style={{
        marginBottom: '16px',
      }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... (Ctrl+Enter to submit)"
          style={textareaStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#58a6ff'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(88, 166, 255, 0.1)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#21262d'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '8px',
        }}>
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: newComment.trim() ? '#238636' : '#21262d',
              border: '1px solid',
              borderColor: newComment.trim() ? '#2ea043' : '#30363d',
              borderRadius: '6px',
              color: newComment.trim() ? '#ffffff' : '#484f58',
              cursor: newComment.trim() ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <IconSend size={14} />
            {submitting ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </div>

      <div style={{
        borderTop: '1px solid #21262d',
        paddingTop: '16px',
      }}>
        {comments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px',
            color: '#484f58',
            fontSize: '14px',
          }}>
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {comments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  background: '#161b22',
                  border: '1px solid #21262d',
                  borderRadius: '8px',
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: '#21262d',
                }}>
                  {comment.avatarUrl ? (
                    <img
                      src={comment.avatarUrl}
                      alt={comment.username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#8b949e',
                    }}>
                      {comment.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#c9d1d9',
                    }}>
                      {comment.username}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: '#484f58',
                    }}>
                      {formatTimeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#c9d1d9',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                  }}>
                    {comment.content}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px',
                  }}>
                    <button style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#484f58',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'color 0.15s ease',
                    }}>
                      <IconHeartOutline size={12} />
                      {comment.likeCount > 0 && comment.likeCount}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
