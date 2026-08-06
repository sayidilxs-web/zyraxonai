import { useState } from 'react'
import { EcosystemItem, getAuthState } from '../../lib/ecosystem'
import { LikeButton } from './LikeButton'
import { ShareButton } from './ShareButton'
import { CommentSection } from './CommentSection'
import { RatingStars } from './RatingStars'
import { SecurityBadge } from './SecurityBadge'
import { InstallButton } from './InstallButton'
import { IconArrowLeft, IconExternalLink, IconCode, IconDownload, IconStar, IconCopy, IconCheck, IconChevronLeft, IconChevronRight, IconGlobe, IconMonitor, IconSmartphone, IconTerminal, IconCalendar, IconMaximize, IconX, IconLoader } from './Icons'

interface ProductDetailProps {
  item: EcosystemItem | null
  onClose: () => void
  onInstall?: (item: EcosystemItem) => void
}

function PlatformBadge({ platform }: { platform: string }) {
  const icons: Record<string, React.ReactNode> = {
    windows: <IconMonitor size={12} />,
    macos: <IconMonitor size={12} />,
    linux: <IconTerminal size={12} />,
    android: <IconSmartphone size={12} />,
    ios: <IconSmartphone size={12} />,
    web: <IconGlobe size={12} />,
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 8px',
      background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '6px',
      fontSize: '11px',
      color: '#8b949e',
      textTransform: 'capitalize',
    }}>
      {icons[platform] || <IconGlobe size={12} />}
      {platform}
    </span>
  )
}

function getActionConfig(item: EcosystemItem) {
  if (item.installCommand) return { label: 'Install', action: 'install' as const }
  if (item.downloadUrl) return { label: 'Download', action: 'download' as const }
  if (item.liveDemo) return { label: 'Live Preview', action: 'demo' as const }
  if (item.githubRepo) return { label: 'View Source', action: 'source' as const }
  return { label: 'Get', action: 'get' as const }
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ item, onClose, onInstall }) => {
  const [copied, setCopied] = useState(false)
  const [screenshotIndex, setScreenshotIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const auth = getAuthState()

  if (!item) return null

  const actionConfig = getActionConfig(item)
  const screenshots = item.screenshots || []
  const hasScreenshots = screenshots.length > 0

  const copyInstallCommand = async () => {
    if (!item.installCommand) return
    try {
      // Wrap the install command in a Start-Process call so it works in PowerShell
      const cmd = `Start-Process "${item.installCommand}"`
      await navigator.clipboard.writeText(cmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleAction = () => {
    if (actionConfig.action === 'install' || actionConfig.action === 'download') {
      // Hand the install off to the ZYRAXON AI desktop app via its
      // registered deep-link protocol (never a third-party editor).
      onInstall?.(item)
      const deepLink = `zyraxon://install/extension/${encodeURIComponent(item.id || item.name)}`
      const fallbackUrl = `https://zyraxonai.lovable.app/ecosystem?item=${encodeURIComponent(item.id || item.name)}`
      try {
        window.location.href = deepLink
        window.setTimeout(() => {
          window.location.assign(fallbackUrl)
        }, 700)
      } catch {
        window.location.assign(fallbackUrl)
      }
    } else if (actionConfig.action === 'demo' && item.liveDemo) {
      window.open(item.liveDemo, '_blank')
    } else if (item.githubRepo) {
      window.open(item.githubRepo, '_blank')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatDownloads = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(n)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
      zIndex: 999,
      overflow: 'auto',
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            color: '#c9d1d9',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff50'; e.currentTarget.style.color = '#58a6ff' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#c9d1d9' }}
        >
          <IconArrowLeft size={16} />
          Back
        </button>

        <div style={{ flex: 1 }} />

        <ShareButton itemId={item.id} itemName={item.name} />

        <a
          href={`https://zyraxonai.lovable.app/ecosystem?item=${encodeURIComponent(item.id || item.name)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid rgba(137, 87, 229, 0.4)',
            borderRadius: '8px',
            color: '#8957e5',
            fontSize: '13px',
            fontWeight: '500',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8957e5'; e.currentTarget.style.background = 'rgba(137,87,229,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(137, 87, 229, 0.4)'; e.currentTarget.style.background = 'transparent' }}
        >
          <IconExternalLink size={14} />
          View on Website
        </a>

        {item.githubRepo && (
          <a
            href={item.githubRepo}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#8b949e',
              fontSize: '13px',
              fontWeight: '500',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff50'; e.currentTarget.style.color = '#58a6ff' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e' }}
          >
            <IconCode size={14} />
            Source Code
          </a>
        )}

        <button
          onClick={handleAction}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: '#238636',
            border: '1px solid #2ea043',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#2ea043' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#238636' }}
        >
          {actionConfig.action === 'install' && <IconTerminal size={14} />}
          {actionConfig.action === 'download' && <IconDownload size={14} />}
          {actionConfig.label}
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px 64px' }}>
        <div style={{
          position: 'relative',
          height: '320px',
          borderRadius: '0 0 16px 16px',
          overflow: 'hidden',
          marginBottom: '32px',
        }}>
          {item.coverImage ? (
            <img src={item.coverImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #161b22 0%, #1a1e2e 50%, #0d1117 100%)',
            }} />
          )}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 40%, rgba(13, 17, 23, 0.9) 100%)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '16px',
          }}>
            {item.logo && (
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '3px solid #21262d',
                background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
                flexShrink: 0,
              }}>
                <img src={item.logo} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', margin: '0 0 4px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                {item.name}
              </h1>
              <div style={{ fontSize: '14px', color: '#c9d1d9', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                by {item.author}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px' }}>
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              <span style={{
                padding: '4px 12px',
                background: 'rgba(88, 166, 255, 0.1)',
                border: '1px solid rgba(88, 166, 255, 0.2)',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#58a6ff',
                textTransform: 'capitalize',
              }}>
                {item.category.replace(/-/g, ' ')}
              </span>
              <span style={{
                padding: '4px 10px',
                background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#8b949e',
              }}>
                v{item.version}
              </span>
              {item.verified && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: 'rgba(63, 185, 80, 0.1)',
                  border: '1px solid rgba(63, 185, 80, 0.2)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#3fb950',
                }}>
                  <IconCheck size={12} />
                  Verified
                </span>
              )}
              {item.license && (
                <span style={{
                  padding: '4px 10px',
                  background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#8b949e',
                }}>
                  {item.license}
                </span>
              )}
            </div>

            {item.platforms && item.platforms.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                {item.platforms.map((platform) => (
                  <PlatformBadge key={platform} platform={platform} />
                ))}
              </div>
            )}

            <div style={{
              fontSize: '15px',
              color: '#c9d1d9',
              lineHeight: '1.7',
              marginBottom: '24px',
              whiteSpace: 'pre-wrap',
            }}>
              {item.description}
            </div>

            {item.tags && item.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '32px' }}>
                {item.tags.map((tag) => (
                  <span key={tag} style={{
                    padding: '3px 10px',
                    background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#8b949e',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {item.installCommand && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 12px' }}>Install</h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                }}>
                  <code style={{
                    flex: 1,
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: '#c9d1d9',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.installCommand}
                  </code>
                  <button
                    onClick={copyInstallCommand}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      background: copied ? 'rgba(63, 185, 80, 0.1)' : '#21262d',
                      border: '1px solid',
                      borderColor: copied ? 'rgba(63, 185, 80, 0.3)' : '#30363d',
                      borderRadius: '6px',
                      color: copied ? '#3fb950' : '#8b949e',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {hasScreenshots && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 12px' }}>Screenshots</h3>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
                    aspectRatio: '16/9',
                  }}>
                    <img
                      src={screenshots[screenshotIndex]}
                      alt={`Screenshot ${screenshotIndex + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  {screenshots.length > 1 && (
                    <>
                      <button
                        onClick={() => setScreenshotIndex((i) => (i > 0 ? i - 1 : screenshots.length - 1))}
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(22, 27, 34, 0.9)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#c9d1d9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          outline: 'none',
                        }}
                      >
                        <IconChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => setScreenshotIndex((i) => (i < screenshots.length - 1 ? i + 1 : 0))}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(22, 27, 34, 0.9)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#c9d1d9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          outline: 'none',
                        }}
                      >
                        <IconChevronRight size={18} />
                      </button>
                    </>
                  )}
                  {screenshots.length > 1 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '12px',
                    }}>
                      {screenshots.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setScreenshotIndex(idx)}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: idx === screenshotIndex ? '#58a6ff' : '#30363d',
                            border: 'none',
                            cursor: 'pointer',
                            outline: 'none',
                            padding: 0,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {item.liveDemo && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: 0 }}>Live Preview</h3>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      background: showPreview ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                      border: '1px solid',
                      borderColor: showPreview ? 'rgba(88, 166, 255, 0.3)' : '#30363d',
                      borderRadius: '6px',
                      color: showPreview ? '#58a6ff' : '#8b949e',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  >
                    {showPreview ? <IconX size={12} /> : <IconMaximize size={12} />}
                    {showPreview ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showPreview && (
                  <div style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    aspectRatio: '16/9',
                    background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
                  }}>
                    <iframe
                      src={item.liveDemo}
                      title="Live Preview"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 16px' }}>Comments</h3>
              <CommentSection itemId={item.id} comments={[]} />
            </div>
          </div>

          <div style={{ position: 'sticky', top: '72px', alignSelf: 'start' }}>
            <div style={{
              background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
                  flexShrink: 0,
                }}>
                  {item.authorAvatar ? (
                    <img src={item.authorAvatar} alt={item.author} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#8b949e',
                    }}>
                      {item.author?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#c9d1d9' }}>{item.author}</div>
                  <div style={{ fontSize: '12px', color: '#8b949e' }}>Author</div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <div style={{
                  padding: '10px',
                  background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d29922', fontSize: '14px', fontWeight: '600' }}>
                    <IconStar size={14} />
                    {item.rating.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#484f58', marginTop: '2px' }}>Rating</div>
                </div>
                <div style={{
                  padding: '10px',
                  background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#c9d1d9' }}>{formatDownloads(item.downloads)}</div>
                  <div style={{ fontSize: '11px', color: '#484f58', marginTop: '2px' }}>Downloads</div>
                </div>
                <div style={{
                  padding: '10px',
                  background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#c9d1d9' }}>{item.likeCount}</div>
                  <div style={{ fontSize: '11px', color: '#484f58', marginTop: '2px' }}>Likes</div>
                </div>
                <div style={{
                  padding: '10px',
                  background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#c9d1d9' }}>v{item.version}</div>
                  <div style={{ fontSize: '11px', color: '#484f58', marginTop: '2px' }}>Version</div>
                </div>
              </div>

              {item.fileSize && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '13px',
                }}>
                  <span style={{ color: '#8b949e' }}>File Size</span>
                  <span style={{ color: '#c9d1d9' }}>{item.fileSize}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: '13px',
              }}>
                <span style={{ color: '#8b949e' }}>Updated</span>
                <span style={{ color: '#c9d1d9' }}>{formatDate(item.updatedAt)}</span>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#8b949e', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rate this item</h4>
                <RatingStars itemId={item.id} initialAverage={item.rating} />
              </div>

              <div style={{ marginTop: '16px' }}>
                <LikeButton itemId={item.id} initialLikeCount={item.likeCount} />
              </div>

              <div style={{ marginTop: '16px' }}>
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
                  detailed
                />
              </div>

              <div style={{ marginTop: '12px' }}>
                <InstallButton
                  target={{
                    id: item.id,
                    displayName: item.name,
                    version: item.version,
                    publisher: item.author,
                    icon: item.logo || item.icon,
                    source: 'extension',
                  }}
                  size="md"
                />
              </div>
            </div>

            {item.socialLinks && Object.keys(item.socialLinks).length > 0 && (
              <div style={{
                background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#8b949e', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Links
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(item.socialLinks).map(([key, url]) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        background: 'transparent',
                        border: '1px solid transparent',
                        borderRadius: '6px',
                        color: '#58a6ff',
                        fontSize: '13px',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.borderColor = '#30363d' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                    >
                      <IconExternalLink size={12} />
                      <span style={{ textTransform: 'capitalize' }}>{key}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
