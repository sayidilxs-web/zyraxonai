import { useState } from 'react'
import { EcosystemItem, Comment } from '../../lib/ecosystem'
import { LikeButton } from './LikeButton'
import { ShareButton } from './ShareButton'
import { CommentSection } from './CommentSection'

interface DetailModalProps {
  item: EcosystemItem | null
  onClose: () => void
  onInstall?: (item: EcosystemItem) => void
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const renderStars = (rating: number) => {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} style={{ color: i <= Math.round(rating) ? '#e3b341' : '#30363d', fontSize: '14px' }}>★</span>
    )
  }
  return stars
}

const TYPE_COLORS: Record<string, string> = {
  bot: '#8957e5', plugin: '#238636', template: '#1f6feb', theme: '#a371f7',
  model: '#da3633', tool: '#238636', cli: '#238636', sdk: '#1f6feb',
  extension: '#da3633', app: '#8957e5', 'desktop-app': '#238636',
  workflow: '#1f6feb', 'ui-kit': '#a371f7', snippet: '#8b949e', devops: '#238636',
  font: '#8b949e', 'landing-page': '#1f6feb', iso: '#da3633', startkit: '#1f6feb',
  api: '#1f6feb', dataset: '#da3633', prompt: '#8957e5', book: '#e3b341',
  pdf: '#da3633', icon: '#a371f7', component: '#1f6feb',
}

const getButtonConfig = (item: EcosystemItem) => {
  const cat = item.category
  if (cat === 'plugins') return { label: 'Install Plugin', color: '#238636', hover: '#2ea043', action: 'install' as const }
  if (cat === 'ai-bots') return { label: 'Add Bot', color: '#8957e5', hover: '#a371f7', action: 'install' as const }
  if (cat === 'website-templates') return { label: 'Use Template', color: '#1f6feb', hover: '#58a6ff', action: 'live' as const }
  if (cat === 'ai-models') return { label: 'Download Model', color: '#da3633', hover: '#f85149', action: 'download' as const }
  if (cat === 'browser-extensions') return { label: 'Add Extension', color: '#da3633', hover: '#f85149', action: 'download' as const }
  if (cat === 'themes') return { label: 'Apply Theme', color: '#8957e5', hover: '#a371f7', action: 'install' as const }
  if (cat === 'workflows') return { label: 'Import Workflow', color: '#1f6feb', hover: '#58a6ff', action: 'install' as const }
  if (cat === 'desktop-apps') return { label: 'Download App', color: '#238636', hover: '#2ea043', action: 'download' as const }
  if (cat === 'mobile-apps') return { label: 'Get App', color: '#8957e5', hover: '#a371f7', action: 'live' as const }
  if (item.installCommand) return { label: 'Install', color: '#238636', hover: '#2ea043', action: 'install' as const }
  if (item.liveDemo) return { label: 'View Live', color: '#1f6feb', hover: '#58a6ff', action: 'live' as const }
  if (item.downloadUrl) return { label: 'Download', color: '#238636', hover: '#2ea043', action: 'download' as const }
  if (item.githubRepo) return { label: 'View Source', color: '#21262d', hover: '#30363d', action: 'github' as const }
  return { label: 'View', color: '#21262d', hover: '#30363d', action: 'view' as const }
}

export const DetailModal: React.FC<DetailModalProps> = ({ item, onClose, onInstall }) => {
  const [actionDone, setActionDone] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])

  if (!item) return null

  const btn = getButtonConfig(item)
  const typeColor = TYPE_COLORS[item.type] || '#58a6ff'

  const handleInstall = () => {
    if (item.installCommand) {
      navigator.clipboard.writeText(item.installCommand).then(() => {
        setActionDone(true)
        setTimeout(() => setActionDone(false), 2000)
      }).catch(() => {})
      return
    }
    if (item.downloadUrl) {
      window.open(item.downloadUrl, '_blank')
      return
    }
    if (item.liveDemo) {
      window.open(item.liveDemo, '_blank')
      return
    }
    if (item.githubRepo) {
      window.open(item.githubRepo, '_blank')
      return
    }
    if (onInstall) onInstall(item)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#161b22',
          border: '1px solid #21262d',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #21262d',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f0f6fc', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}
            </h2>
            <span style={{
              padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
              fontWeight: '600', textTransform: 'capitalize', flexShrink: 0,
              background: `${typeColor}20`, color: typeColor,
            }}>
              {item.type}
            </span>
            <span style={{ fontSize: '12px', color: '#484f58', flexShrink: 0 }}>
              v{item.version}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'transparent', border: '1px solid #21262d',
              color: '#8b949e', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              fontFamily: 'inherit', outline: 'none', flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#484f58'; e.currentTarget.style.color = '#c9d1d9' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.color = '#8b949e' }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: '20px' }}>
          {item.coverImage && (
            <div style={{
              borderRadius: '10px', overflow: 'hidden', marginBottom: '20px',
              border: '1px solid #21262d',
            }}>
              <img src={item.coverImage} alt={item.name} style={{ width: '100%', display: 'block' }} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {(item.icon || item.logo) && (
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                overflow: 'hidden', background: '#21262d', flexShrink: 0,
              }}>
                <img src={item.icon || item.logo} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div>
              <p style={{ fontSize: '14px', color: '#8b949e', lineHeight: '1.6', margin: 0 }}>
                {item.description}
              </p>
            </div>
          </div>

          {item.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {item.tags.map((tag) => (
                <span key={tag} style={{
                  padding: '4px 10px', background: '#21262d', borderRadius: '14px',
                  fontSize: '12px', color: '#8b949e',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {item.platforms && item.platforms.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {item.platforms.map((p) => (
                <span key={p} style={{
                  padding: '4px 10px', background: 'rgba(88, 166, 255, 0.1)',
                  borderRadius: '14px', fontSize: '12px', color: '#58a6ff',
                }}>
                  {p}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={handleInstall}
              style={{
                padding: '10px 20px', borderRadius: '8px',
                background: actionDone ? '#238636' : btn.color,
                border: 'none', color: '#ffffff', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', outline: 'none',
                transition: 'background 0.2s ease',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
              onMouseEnter={(e) => { if (!actionDone) e.currentTarget.style.background = btn.hover }}
              onMouseLeave={(e) => { e.currentTarget.style.background = actionDone ? '#238636' : btn.color }}
            >
              {actionDone ? '✓ Copied!' : btn.label}
            </button>

            {item.githubRepo && (
              <button
                onClick={() => window.open(item.githubRepo, '_blank')}
                style={{
                  padding: '10px 20px', borderRadius: '8px',
                  background: 'transparent', border: '1px solid #30363d',
                  color: '#c9d1d9', cursor: 'pointer', fontSize: '14px',
                  fontWeight: '500', fontFamily: 'inherit', outline: 'none',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d' }}
              >
                📂 Source Code
              </button>
            )}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '12px', marginBottom: '20px',
          }}>
            {[
              { label: 'Rating', value: `${item.rating.toFixed(1)} ★` },
              { label: 'Downloads', value: formatNumber(item.downloads) },
              { label: 'Likes', value: formatNumber(item.likeCount) },
              { label: 'Version', value: item.version },
              { label: 'Size', value: item.fileSize || 'N/A' },
            ].map((stat) => (
              <div key={stat.label} style={{
                padding: '12px', background: '#0d1117', borderRadius: '8px',
                border: '1px solid #21262d', textAlign: 'center',
              }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#f0f6fc' }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: '#484f58', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center' }}>
            <LikeButton itemId={item.id} initialLikeCount={item.likeCount} />
            <ShareButton itemId={item.id} itemName={item.name} itemUrl={item.liveDemo || item.githubRepo} />
          </div>

          <div style={{ borderTop: '1px solid #21262d', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f0f6fc', marginBottom: '16px' }}>
              Comments ({item.commentCount})
            </h3>
            <CommentSection itemId={item.id} comments={comments} onCommentAdded={(c) => setComments((prev) => [c, ...prev])} />
          </div>
        </div>
      </div>
    </div>
  )
}
