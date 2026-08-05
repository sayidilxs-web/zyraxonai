import { useState, useEffect } from 'react'
import { EcosystemItem, getAllItems, getAuthState, getGitHubStorage } from '../../lib/ecosystem'
import { ShareButton } from './ShareButton'
import { ItemDotMenu } from './ItemDotMenu'

interface MarketplaceProps {
  onSelectItem?: (item: EcosystemItem) => void
  onUserClick?: (username: string) => void
}

const CATEGORIES = [
  'All', 'AI Bots', 'Plugins', 'Templates', 'Themes', 'Components', 'Desktop Apps',
  'Mobile Apps', 'AI Models', 'Dev Tools', 'CLI Tools', 'SDKs', 'Fonts', 'ISO Images',
  'DevOps', 'PDFs', 'Books', 'AI Prompts', 'Datasets', 'Snippets', 'APIs',
  'Extensions', 'Landing Pages', 'UI Kits', 'Icons', 'Starter Kits', 'Workflows',
  'Website Games',
] as const

const CATEGORY_MAP: Record<string, string> = {
  'All': '', 'AI Bots': 'ai-bots', 'Plugins': 'plugins', 'Templates': 'website-templates',
  'Themes': 'themes', 'Components': 'components', 'Desktop Apps': 'desktop-apps',
  'Mobile Apps': 'mobile-apps', 'AI Models': 'ai-models', 'Dev Tools': 'tools',
  'CLI Tools': 'cli-tools', 'SDKs': 'sdks', 'Fonts': 'fonts', 'ISO Images': 'iso-images',
  'DevOps': 'devops', 'PDFs': 'pdfs', 'Books': 'books', 'AI Prompts': 'prompts',
  'Datasets': 'datasets', 'Snippets': 'code-snippets', 'APIs': 'apis',
  'Extensions': 'browser-extensions', 'Landing Pages': 'landing-pages',
  'UI Kits': 'ui-kits', 'Icons': 'icons', 'Starter Kits': 'startkits', 'Workflows': 'workflows',
  'Website Games': 'website-games',
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
      <span key={i} style={{ color: i <= Math.round(rating) ? '#e3b341' : '#30363d', fontSize: '12px' }}>
        ★
      </span>
    )
  }
  return stars
}

const TYPE_COLORS: Record<string, string> = {
  bot: '#8957e5', plugin: '#238636', template: '#1f6feb', theme: '#a371f7',
  model: '#da3633', tool: '#238636', cli: '#238636', sdk: '#1f6feb',
  extension: '#da3633', app: '#8957e5', 'desktop-app': '#238636',
  workflow: '#1f6feb', 'ui-kit': '#a371f7', snippet: '#8b949e', devops: '#238636',
  font: '#8b949e', 'landing-page': '#1f6feb', 'iso': '#da3633', 'startkit': '#1f6feb',
  api: '#1f6feb', dataset: '#da3633', prompt: '#8957e5', book: '#e3b341',
  pdf: '#da3633', icon: '#a371f7', component: '#1f6feb', 'website-game': '#f0883e',
}

const getActionInfo = (item: EcosystemItem) => {
  const cat = item.category
  if (cat === 'website-games') return { label: 'Play Game', color: '#f0883e', hoverColor: '#d29922' }
  if (cat === 'plugins') return { label: 'Install', color: '#238636', hoverColor: '#2ea043' }
  if (cat === 'ai-bots') return { label: 'Add Bot', color: '#8957e5', hoverColor: '#a371f7' }
  if (cat === 'website-templates') return { label: 'Use Template', color: '#1f6feb', hoverColor: '#58a6ff' }
  if (cat === 'ai-models') return { label: 'Download', color: '#da3633', hoverColor: '#f85149' }
  if (cat === 'tools' || cat === 'cli-tools') return { label: 'Download', color: '#238636', hoverColor: '#2ea043' }
  if (cat === 'browser-extensions') return { label: 'Add Extension', color: '#da3633', hoverColor: '#f85149' }
  if (cat === 'themes') return { label: 'Apply Theme', color: '#8957e5', hoverColor: '#a371f7' }
  if (cat === 'workflows') return { label: 'Import', color: '#1f6feb', hoverColor: '#58a6ff' }
  if (item.installCommand) return { label: 'Install', color: '#238636', hoverColor: '#2ea043' }
  if (item.liveDemo) return { label: 'Live Demo', color: '#1f6feb', hoverColor: '#58a6ff' }
  if (item.downloadUrl) return { label: 'Download', color: '#238636', hoverColor: '#2ea043' }
  return { label: 'View', color: '#21262d', hoverColor: '#30363d' }
}

export const Marketplace: React.FC<MarketplaceProps> = ({ onSelectItem, onUserClick }) => {
  const [items, setItems] = useState<EcosystemItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'top-rated'>('newest')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true)
      try {
        const allItems = await getAllItems()
        setItems(allItems)
      } catch {}
      setLoading(false)
    }
    loadItems()
  }, [])

  const filteredItems = items
    .filter((item) => {
      if (selectedCategory !== 'All' && item.category !== CATEGORY_MAP[selectedCategory]) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const authorName = typeof item.author === 'string' ? item.author : (item.author as any)?.name || ''
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          authorName.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'popular') return b.downloads - a.downloads
      return b.rating - a.rating
    })

  const totalItems = items.length
  const totalPlugins = items.filter((i) => i.type === 'plugin' || i.category === 'plugins').length
  const totalTemplates = items.filter((i) => i.type === 'template' || i.category === 'website-templates').length
  const totalBots = items.filter((i) => i.type === 'bot' || i.category === 'ai-bots').length

  return (
    <div style={{ color: '#c9d1d9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(1200px 400px at 15% -10%, rgba(137,87,229,0.22), transparent 60%), radial-gradient(1000px 400px at 90% -20%, rgba(88,166,255,0.18), transparent 55%), linear-gradient(160deg, #161b22 0%, #0d1117 55%, #1a1025 100%)',
        borderBottom: '1px solid #21262d',
        padding: '44px 0 34px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 20, background: 'rgba(137,87,229,0.15)', border: '1px solid rgba(137,87,229,0.35)', color: '#a371f7', fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: '0.3px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8957e5', boxShadow: '0 0 10px rgba(137,87,229,0.9)' }} />
            ZYRAXON AI ECOSYSTEM
          </div>
          <h1 style={{ fontSize: '34px', fontWeight: '800', color: '#f0f6fc', marginBottom: '8px', letterSpacing: '-0.5px', background: 'linear-gradient(120deg, #f0f6fc 30%, #b39bf0 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ZYRAXON Marketplace
          </h1>
          <p style={{ fontSize: '16px', color: '#8b949e', marginBottom: '24px' }}>
            Discover plugins, templates, bots, and more — install straight into ZYRAXON AI
          </p>
          <div style={{ display: 'flex', gap: '36px', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Items', value: totalItems, color: '#58a6ff' },
              { label: 'Plugins', value: totalPlugins, color: '#3fb950' },
              { label: 'Templates', value: totalTemplates, color: '#a371f7' },
              { label: 'Bots', value: totalBots, color: '#f0883e' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '26px', fontWeight: '800', color: stat.color, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: '#8b949e' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e', fontSize: '14px' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search plugins, templates, bots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '8px',
                color: '#c9d1d9',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#21262d' }}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={{
              padding: '10px 12px',
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: '8px',
              color: '#c9d1d9',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="top-rated">Top Rated</option>
          </select>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          padding: '16px',
          background: '#161b22',
          border: '1px solid #21262d',
          borderRadius: '10px',
        }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: selectedCategory === cat ? '#58a6ff' : '#30363d',
                background: selectedCategory === cat ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                color: selectedCategory === cat ? '#58a6ff' : '#8b949e',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{
              width: '40px', height: '40px', border: '3px solid #21262d',
              borderTopColor: '#58a6ff', borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            background: '#161b22', borderRadius: '12px', border: '1px solid #21262d',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#c9d1d9', marginBottom: '8px' }}>
              No items yet
            </h3>
            <p style={{ fontSize: '14px', color: '#8b949e' }}>
              Items will appear here once AI publishes them
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
          }}>
            {filteredItems.map((item) => {
              const action = getActionInfo(item)
              const isHovered = hoveredItem === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem?.(item)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    background: '#161b22',
                    border: '1px solid #21262d',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  {item.coverImage ? (
                    <div style={{
                      height: '160px', overflow: 'hidden', background: '#0d1117',
                      borderBottom: '1px solid #21262d',
                    }}>
                      <img
                        src={item.coverImage}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      height: '160px',
                      background: `linear-gradient(135deg, ${(TYPE_COLORS[item.type] || '#58a6ff')}22, ${(TYPE_COLORS[item.type] || '#58a6ff')}08)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderBottom: '1px solid #21262d',
                    }}>
                      {item.icon ? (
                        <img src={item.icon} alt={item.name} style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '48px', fontWeight: '700', color: TYPE_COLORS[item.type] || '#58a6ff', opacity: 0.5 }}>
                          {item.name.charAt(0)}
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                        fontWeight: '600', textTransform: 'capitalize',
                        background: `${TYPE_COLORS[item.type] || '#58a6ff'}20`,
                        color: TYPE_COLORS[item.type] || '#58a6ff',
                      }}>
                        {item.type}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#484f58' }}>
                          v{item.version}
                        </span>
                        <ItemDotMenu item={item} align="right" />
                      </span>
                    </div>

                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f0f6fc', marginBottom: '4px' }}>
                      {item.name}
                    </h3>
                    <p style={{
                      fontSize: '13px', color: '#8b949e', lineHeight: '1.5', marginBottom: '12px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {item.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden',
                        background: '#21262d', flexShrink: 0,
                      }}>
                        {item.authorAvatar ? (
                          <img src={item.authorAvatar} alt={typeof item.author === 'string' ? item.author : (item.author as any)?.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{
                            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#8b949e',
                          }}>
                            {typeof item.author === 'string' ? item.author.charAt(0).toUpperCase() : ((item.author as any)?.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUserClick?.(typeof item.author === 'string' ? item.author : (item.author as any)?.name || '') }}
                        style={{
                          background: 'transparent', border: 'none', padding: 0,
                          fontSize: '12px', color: '#8b949e', cursor: 'pointer',
                          fontFamily: 'inherit', outline: 'none',
                        }}
                      >
                        {typeof item.author === 'string' ? item.author : (item.author as any)?.name || 'Unknown'}                      </button>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#8b949e',
                      marginBottom: '12px',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ display: 'flex', gap: '1px' }}>{renderStars(item.rating)}</span>
                        <span style={{ color: '#c9d1d9', fontWeight: '500' }}>{item.rating.toFixed(1)}</span>
                      </span>
                      <span>↓ {formatNumber(item.downloads)}</span>
                      <span>💬 {item.commentCount}</span>
                    </div>

                    <div style={{
                      display: 'flex', gap: '6px', opacity: isHovered ? 1 : 0,
                      transition: 'opacity 0.2s ease', alignItems: 'center',
                    }}>
                      <ShareButton itemId={item.id} itemName={item.name} itemUrl={item.liveDemo || item.githubRepo} />
                      {item.liveDemo ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(item.liveDemo, '_blank') }}
                          style={{
                            padding: '6px 12px', background: 'transparent', border: '1px solid #30363d',
                            borderRadius: '6px', color: '#58a6ff', cursor: 'pointer', fontSize: '12px',
                            fontWeight: '500', fontFamily: 'inherit', outline: 'none',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            transition: 'border-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff50' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d' }}
                        >
                          ↗ Live
                        </button>
                      ) : item.downloadUrl ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(item.downloadUrl, '_blank') }}
                          style={{
                            padding: '6px 12px', background: 'transparent', border: '1px solid #30363d',
                            borderRadius: '6px', color: '#58a6ff', cursor: 'pointer', fontSize: '12px',
                            fontWeight: '500', fontFamily: 'inherit', outline: 'none',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            transition: 'border-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff50' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d' }}
                        >
                          ↓ Download
                        </button>
                      ) : item.installCommand ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(item.installCommand!)
                          }}
                          style={{
                            padding: '6px 12px', background: 'transparent', border: '1px solid #30363d',
                            borderRadius: '6px', color: '#58a6ff', cursor: 'pointer', fontSize: '12px',
                            fontWeight: '500', fontFamily: 'inherit', outline: 'none',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            transition: 'border-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff50' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d' }}
                        >
                          📋 Copy
                        </button>
                      ) : null}
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectItem?.(item) }}
                        style={{
                          padding: '6px 14px', background: action.color, border: 'none',
                          borderRadius: '6px', color: '#ffffff', cursor: 'pointer',
                          fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', outline: 'none',
                          marginLeft: 'auto', transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = action.hoverColor }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = action.color }}
                      >
                        {action.label}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
