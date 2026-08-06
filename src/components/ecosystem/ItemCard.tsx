import React, { useCallback, useState } from 'react'
import { EcosystemItem, getAuthState, getGitHubStorage } from '../../lib/ecosystem'
import { IconStar, IconDownload, IconMessageSquare, IconHeart, IconHeartOutline, IconCheck, IconCopy, IconExternalLink, IconRocket } from './Icons'
import { ShareButton } from './ShareButton'
import { ItemDotMenu } from './ItemDotMenu'
import { SecurityBadge } from './SecurityBadge'

interface ItemCardProps {
  item: EcosystemItem
  onInstall?: (item: EcosystemItem) => void
  onClick?: (item: EcosystemItem) => void
  onUserClick?: (username: string) => void
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const renderStars = (rating: number): React.ReactNode[] => {
  const stars: React.ReactNode[] = []
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.floor(rating)
    const half = !filled && i - 0.5 <= rating
    stars.push(
      <span key={i} style={{ color: filled || half ? '#e3b341' : '#30363d', fontSize: '12px' }}>
        <IconStar size={12} />
      </span>
    )
  }
  return stars
}

interface ActionInfo {
  label: string
  color: string
  hoverColor: string
  icon: React.FC<{ size?: number; className?: string }>
}

const getActionInfo = (item: EcosystemItem): ActionInfo => {
  const category = item.category
  const type = item.type

  if (category === 'plugins' || type === 'plugin') {
    return { label: 'Install', color: '#238636', hoverColor: '#2ea043', icon: IconRocket }
  }
  if (category === 'ai-bots' || type === 'bot') {
    return { label: 'Add Bot', color: '#8957e5', hoverColor: '#a371f7', icon: IconRocket }
  }
  if (category === 'website-templates' || type === 'template') {
    return { label: 'Use Template', color: '#1f6feb', hoverColor: '#58a6ff', icon: IconExternalLink }
  }
  if (category === 'ai-models' || type === 'model') {
    return { label: 'Download', color: '#da3633', hoverColor: '#f85149', icon: IconDownload }
  }
  if (category === 'tools' || type === 'tool') {
    return { label: 'Download', color: '#238636', hoverColor: '#2ea043', icon: IconDownload }
  }
  if (category === 'cli-tools' || type === 'cli') {
    return { label: 'Install CLI', color: '#238636', hoverColor: '#2ea043', icon: IconRocket }
  }
  if (category === 'sdks' || type === 'sdk') {
    return { label: 'Install', color: '#1f6feb', hoverColor: '#58a6ff', icon: IconRocket }
  }
  if (category === 'browser-extensions' || type === 'extension') {
    return { label: 'Add Extension', color: '#da3633', hoverColor: '#f85149', icon: IconRocket }
  }
  if (category === 'mobile-apps' || type === 'app') {
    return { label: 'Get App', color: '#8957e5', hoverColor: '#a371f7', icon: IconExternalLink }
  }
  if (category === 'desktop-apps' || type === 'desktop-app') {
    return { label: 'Download', color: '#238636', hoverColor: '#2ea043', icon: IconDownload }
  }
  if (category === 'themes' || type === 'theme') {
    return { label: 'Apply Theme', color: '#8957e5', hoverColor: '#a371f7', icon: IconExternalLink }
  }
  if (category === 'workflows' || type === 'workflow') {
    return { label: 'Import', color: '#1f6feb', hoverColor: '#58a6ff', icon: IconRocket }
  }
  if (item.installCommand) {
    return { label: 'Install', color: '#238636', hoverColor: '#2ea043', icon: IconCopy }
  }
  if (item.liveDemo) {
    return { label: 'Live Demo', color: '#1f6feb', hoverColor: '#58a6ff', icon: IconExternalLink }
  }
  return { label: 'View', color: '#21262d', hoverColor: '#30363d', icon: IconExternalLink }
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onInstall,
  onClick,
  onUserClick,
}) => {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(item.likeCount || 0)
  const [actionDone, setActionDone] = useState(false)
  const [animating, setAnimating] = useState(false)

  const actionInfo = getActionInfo(item)

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    const auth = getAuthState()
    if (!auth.isAuthenticated || !auth.user) return

    setAnimating(true)
    setTimeout(() => setAnimating(false), 300)

    const newLiked = !liked
    const newCount = newLiked ? likeCount + 1 : likeCount - 1
    setLiked(newLiked)
    setLikeCount(newCount)

    try {
      const storage = getGitHubStorage()
      if (!storage) return
      const userLikes = await storage.get(`likes/${auth.user.id}`)
      const likes = Array.isArray(userLikes) ? userLikes : []
      if (newLiked) {
        if (!likes.includes(item.id)) likes.push(item.id)
      } else {
        const idx = likes.indexOf(item.id)
        if (idx > -1) likes.splice(idx, 1)
      }
      await storage.set(`likes/${auth.user.id}`, likes)
      await storage.set(`item_likes/${item.id}`, newCount)
    } catch {}
  }, [liked, likeCount, item.id])

  const handleAction = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.installCommand) {
      navigator.clipboard.writeText(item.installCommand).then(() => {
        setActionDone(true)
        setTimeout(() => setActionDone(false), 2000)
      }).catch(() => {})
      return
    }
    if (item.liveDemo) {
      window.open(item.liveDemo, '_blank')
      return
    }
    if (item.downloadUrl) {
      window.open(item.downloadUrl, '_blank')
      return
    }
    if (item.githubRepo) {
      window.open(item.githubRepo, '_blank')
      return
    }
    if (onInstall) onInstall(item)
  }, [item, onInstall])

  const handleCardClick = () => {
    if (onClick) onClick(item)
  }

  return (
    <div
      onClick={handleCardClick}
      style={{
        background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#58a6ff'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#21262d'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          {item.icon ? (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
            }}>
              <img
                src={item.icon}
                alt={item.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(88, 166, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '16px',
              fontWeight: '700',
              color: '#58a6ff',
            }}>
              {item.name.charAt(0)}
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#c9d1d9',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.name}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUserClick?.(item.author)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: '12px',
                color: '#8b949e',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              {item.author}
            </button>
          </div>
        </div>
        <span style={{
          padding: '3px 8px',
          background: 'rgba(88, 166, 255, 0.1)',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          color: '#58a6ff',
          textTransform: 'capitalize',
          flexShrink: 0,
        }}>
          {item.type}
        </span>
        <ItemDotMenu item={item} align="right" />
      </div>

      <div style={{
        fontSize: '13px',
        color: '#8b949e',
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {item.description}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '12px',
        color: '#8b949e',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'flex', gap: '1px' }}>{renderStars(item.rating)}</span>
          <span style={{ color: '#c9d1d9', fontWeight: '500' }}>{item.rating.toFixed(1)}</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <IconDownload size={12} />
          {formatNumber(item.downloads)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <IconMessageSquare size={12} />
          {item.commentCount}
        </span>
      </div>

      {item.tags && item.tags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
        }}>
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                padding: '2px 8px',
                background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
                borderRadius: '10px',
                fontSize: '11px',
                color: '#8b949e',
              }}
            >
              {tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span style={{
              padding: '2px 8px',
              background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
              borderRadius: '10px',
              fontSize: '11px',
              color: '#484f58',
            }}>
              +{item.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div style={{ marginTop: '8px' }}>
        <SecurityBadge
          input={{
            id: item.id,
            verifiedPublisher: item.verified,
            repository: item.githubRepo || item.repository,
            license: item.license,
            installs: item.downloads,
            rating: item.rating,
            ratingCount: item.reviews,
            lastUpdated: item.updatedAt,
            tags: item.tags,
          }}
        />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: 'auto',
        paddingTop: '4px',
      }}>
        <button
          onClick={handleLike}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            background: liked ? 'rgba(248, 81, 73, 0.1)' : 'transparent',
            border: `1px solid ${liked ? '#f8514950' : '#21262d'}`,
            borderRadius: '6px',
            color: liked ? '#f85149' : '#8b949e',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            outline: 'none',
            flexShrink: 0,
          }}
        >
          <span style={{
            transition: 'transform 0.2s ease',
            transform: animating ? 'scale(1.3)' : 'scale(1)',
            display: 'flex',
          }}>
            {liked ? <IconHeart size={14} /> : <IconHeartOutline size={14} />}
          </span>
          {likeCount}
        </button>

        <ShareButton
          itemId={item.id}
          itemName={item.name}
          itemUrl={item.liveDemo || item.githubRepo}
        />

        <button
          onClick={handleAction}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            background: actionDone ? '#238636' : actionInfo.color,
            border: 'none',
            borderRadius: '6px',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.2s ease',
            marginLeft: 'auto',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!actionDone) e.currentTarget.style.background = actionInfo.hoverColor
          }}
          onMouseLeave={(e) => {
            if (!actionDone) e.currentTarget.style.background = actionInfo.color
            else e.currentTarget.style.background = '#238636'
          }}
        >
          {actionDone ? <IconCheck size={14} /> : <actionInfo.icon size={14} />}
          {actionDone ? 'Copied!' : actionInfo.label}
        </button>
      </div>
    </div>
  )
}
