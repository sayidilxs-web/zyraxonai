import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  getAllItems,
  getCategories,
  getStats,
  getAuthState,
  clearAuthState,
  loginWithToken,
  type EcosystemItem,
  type CategoryInfo,
  type EcosystemStats,
  type User,
} from '../../lib/ecosystem'

type ViewMode = 'home' | 'explore' | 'categories' | 'top-rated' | 'trending' | 'new' | 'product-detail'

export const Route = createFileRoute('/ecosystem')({
  component: EcosystemPage,
})

function EcosystemPage() {
  const [view, setView] = useState<ViewMode>('home')
  const [items, setItems] = useState<EcosystemItem[]>([])
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [stats, setStats] = useState<EcosystemStats>({ plugins: 0, bots: 0, templates: 0, downloads: 0, users: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<EcosystemItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [allItems, cats, st] = await Promise.all([
        getAllItems(),
        getCategories(),
        getStats(),
      ])
      setItems(allItems)
      setCategories(cats)
      setStats(st)
    } catch (err) {
      console.error('Failed to load ecosystem data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const auth = getAuthState()
    if (auth) setUser(auth)
  }, [loadData])

  const filteredItems = useMemo(() => {
    let result = [...items]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.author.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (activeCategory) {
      result = result.filter((i) => i.category === activeCategory)
    }
    return result
  }, [items, searchQuery, activeCategory])

  const sortedItems = useMemo(() => {
    const arr = [...filteredItems]
    switch (view) {
      case 'top-rated':
        return arr.sort((a, b) => b.rating - a.rating)
      case 'trending':
        return arr.sort((a, b) => b.downloads - a.downloads)
      case 'new':
        return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      default:
        return arr
    }
  }, [filteredItems, view])

  const featuredItems = useMemo(() => items.filter((i) => i.featured).slice(0, 4), [items])

  const handleLogin = async (token: string) => {
    const u = await loginWithToken(token)
    if (u) {
      setUser(u)
      setShowLogin(false)
    }
  }

  const handleLogout = () => {
    clearAuthState()
    setUser(null)
  }

  const navigateTo = (v: ViewMode) => {
    setView(v)
    setSelectedItem(null)
    setActiveCategory(null)
    setSearchQuery('')
  }

  const openItem = (item: EcosystemItem) => {
    setSelectedItem(item)
    setView('product-detail')
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#0a0a0f',
        color: '#fff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <Sidebar
        view={view}
        onNavigate={navigateTo}
        user={user}
        onLogin={() => setShowLogin(true)}
        onLogout={handleLogout}
        stats={stats}
      />
      <main style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column' }}>
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          view={view}
          onBack={() => {
            setSelectedItem(null)
            setView('home')
          }}
        />
        <div style={{ flex: 1, padding: '0 32px 32px', overflowY: 'auto' }}>
          {loading ? (
            <LoadingState />
          ) : view === 'product-detail' && selectedItem ? (
            <ProductDetail item={selectedItem} onBack={() => { setSelectedItem(null); setView('home') }} user={user} />
          ) : view === 'home' ? (
            <HomeView
              stats={stats}
              categories={categories}
              featuredItems={featuredItems}
              items={sortedItems}
              onOpenItem={openItem}
              onSelectCategory={(cat) => { setActiveCategory(cat); setView('categories') }}
            />
          ) : view === 'categories' ? (
            <CategoriesView
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              items={filteredItems}
              onOpenItem={openItem}
            />
          ) : (
            <ItemGridView
              items={sortedItems}
              view={view}
              onOpenItem={openItem}
            />
          )}
        </div>
      </main>
      {showLogin && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  )
}

function Sidebar({
  view,
  onNavigate,
  user,
  onLogin,
  onLogout,
  stats,
}: {
  view: ViewMode
  onNavigate: (v: ViewMode) => void
  user: User | null
  onLogin: () => void
  onLogout: () => void
  stats: EcosystemStats
}) {
  const navItems: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '⌂' },
    { id: 'explore', label: 'Explore', icon: '◎' },
    { id: 'categories', label: 'Categories', icon: '⊞' },
    { id: 'top-rated', label: 'Top Rated', icon: '★' },
    { id: 'trending', label: 'Trending', icon: '▲' },
    { id: 'new', label: 'New', icon: '◆' },
  ]

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 240,
        height: '100vh',
        background: '#0d0d12',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #00e5ff, #00b0ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: '#0a0a0f',
            }}
          >
            Z
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>ZYRAXON</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Ecosystem</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: view === item.id ? 600 : 400,
              color: view === item.id ? '#00e5ff' : 'rgba(255,255,255,0.6)',
              background: view === item.id ? 'rgba(0,229,255,0.08)' : 'transparent',
              transition: 'all 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (view !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            }}
            onMouseLeave={(e) => {
              if (view !== item.id) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {[
            { label: 'Plugins', value: stats.plugins },
            { label: 'Bots', value: stats.bots },
            { label: 'Templates', value: stats.templates },
            { label: 'Downloads', value: stats.downloads },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#00e5ff' }}>
                {s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}k` : s.value}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src={user.avatarUrl}
              alt=""
              style={{ width: 28, height: 28, borderRadius: '50%' }}
            />
            <span style={{ fontSize: 13, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.login}
            </span>
            <button
              onClick={onLogout}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid rgba(0,229,255,0.3)',
              background: 'rgba(0,229,255,0.06)',
              color: '#00e5ff',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Sign in with GitHub
          </button>
        )}
      </div>
    </aside>
  )
}

function Header({
  searchQuery,
  onSearchChange,
  view,
  onBack,
}: {
  searchQuery: string
  onSearchChange: (q: string) => void
  view: ViewMode
  onBack: () => void
}) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 32px',
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {view === 'product-detail' && (
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            color: '#fff',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ← Back
        </button>
      )}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '0 14px',
          maxWidth: 480,
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16 }}>⌕</span>
        <input
          type="text"
          placeholder="Search plugins, bots, templates..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: 14,
            padding: '10px 0',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </header>
  )
}

function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(255,255,255,0.08)',
          borderTopColor: '#00e5ff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading ecosystem...</div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#00e5ff' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{label}</div>
    </div>
  )
}

function HomeView({
  stats,
  categories,
  featuredItems,
  items,
  onOpenItem,
  onSelectCategory,
}: {
  stats: EcosystemStats
  categories: CategoryInfo[]
  featuredItems: EcosystemItem[]
  items: EcosystemItem[]
  onOpenItem: (item: EcosystemItem) => void
  onSelectCategory: (cat: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20, color: '#fff' }}>Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard icon="⊡" label="Plugins" value={stats.plugins} />
          <StatCard icon="🤖" label="Bots" value={stats.bots} />
          <StatCard icon="📄" label="Templates" value={stats.templates} />
          <StatCard icon="⬇" label="Total Downloads" value={stats.downloads} />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20, color: '#fff' }}>Categories</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 16px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)'; e.currentTarget.style.background = 'rgba(0,229,255,0.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
            >
              <span style={{ fontSize: 20 }}>{cat.icon || '⊞'}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{cat.count} items</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {featuredItems.length > 0 && (
        <section>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20, color: '#fff' }}>Featured</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} onClick={() => onOpenItem(item)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20, color: '#fff' }}>All Items</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onClick={() => onOpenItem(item)} />
          ))}
        </div>
      </section>
    </div>
  )
}

function CategoriesView({
  categories,
  activeCategory,
  onSelectCategory,
  items,
  onOpenItem,
}: {
  categories: CategoryInfo[]
  activeCategory: string | null
  onSelectCategory: (cat: string | null) => void
  items: EcosystemItem[]
  onOpenItem: (item: EcosystemItem) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          onClick={() => onSelectCategory(null)}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: '1px solid',
            borderColor: !activeCategory ? '#00e5ff' : 'rgba(255,255,255,0.1)',
            background: !activeCategory ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
            color: !activeCategory ? '#00e5ff' : 'rgba(255,255,255,0.5)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => onSelectCategory(cat.name)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: activeCategory === cat.name ? '#00e5ff' : 'rgba(255,255,255,0.1)',
              background: activeCategory === cat.name ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: activeCategory === cat.name ? '#00e5ff' : 'rgba(255,255,255,0.5)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cat.icon || '⊞'} {cat.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onClick={() => onOpenItem(item)} />
        ))}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
          No items found in this category.
        </div>
      )}
    </div>
  )
}

function ItemGridView({
  items,
  view,
  onOpenItem,
}: {
  items: EcosystemItem[]
  view: ViewMode
  onOpenItem: (item: EcosystemItem) => void
}) {
  const titles: Record<string, string> = {
    explore: 'Explore All',
    'top-rated': 'Top Rated',
    trending: 'Trending',
    new: 'New Arrivals',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{titles[view] || 'Items'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onClick={() => onOpenItem(item)} />
        ))}
      </div>
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
          No items found.
        </div>
      )}
    </div>
  )
}

function ItemCard({ item, onClick }: { item: EcosystemItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {item.coverImage && (
        <div
          style={{
            height: 160,
            background: `url(${item.coverImage}) center/cover`,
            background: `linear-gradient(135deg, rgba(0,229,255,0.08), rgba(0,176,255,0.04))`,
          }}
        >
          {item.coverImage && (
            <img
              src={item.coverImage}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
      )}
      {!item.coverImage && (
        <div
          style={{
            height: 120,
            background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(0,176,255,0.04))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            color: 'rgba(0,229,255,0.2)',
          }}
        >
          {item.category === 'Plugin' ? '⊡' : item.category === 'Bot' ? '🤖' : '📄'}
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#00e5ff',
              background: 'rgba(0,229,255,0.08)',
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {item.category}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>★ {item.rating.toFixed(1)}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{item.name}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          by {item.author}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {item.downloads.toLocaleString()} downloads
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#00e5ff',
              background: 'rgba(0,229,255,0.08)',
              padding: '4px 10px',
              borderRadius: 6,
            }}
          >
            View →
          </span>
        </div>
      </div>
    </div>
  )
}

function ProductDetail({
  item,
  onBack,
  user,
}: {
  item: EcosystemItem
  onBack: () => void
  user: User | null
}) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `https://zyraxonai.lovable.app/ecosystem/item/${item.id}`

  const handleCopyInstall = () => {
    navigator.clipboard.writeText(`zyraxon install ${item.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl)
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
      {item.coverImage && (
        <div
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            height: 320,
            background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(0,176,255,0.02))',
          }}
        >
          <img
            src={item.coverImage}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#00e5ff',
                background: 'rgba(0,229,255,0.1)',
                padding: '4px 12px',
                borderRadius: 6,
              }}
            >
              {item.category}
            </span>
            {item.featured && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#fbbf24',
                  background: 'rgba(251,191,36,0.1)',
                  padding: '4px 12px',
                  borderRadius: 6,
                }}
              >
                ★ Featured
              </span>
            )}
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: 0 }}>{item.name}</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
            {item.description}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {item.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {item.platforms && item.platforms.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {item.platforms.map((p) => (
                <span
                  key={p}
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 14,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <span>★ {item.rating.toFixed(1)}</span>
            <span>↓ {item.downloads.toLocaleString()} downloads</span>
            <span>v{item.version}</span>
          </div>
        </div>

        <div
          style={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Install</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 6,
                padding: '8px 12px',
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#00e5ff',
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                zyraxon install {item.id}
              </span>
              <button
                onClick={handleCopyInstall}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? '#22c55e' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {copied ? '✓' : '⎘'}
              </button>
            </div>

            <a
              href={item.github || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #00e5ff, #00b0ff)',
                color: '#0a0a0f',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              ⬇ Download
            </a>

            {item.liveDemo && (
              <a
                href={item.liveDemo}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(0,229,255,0.3)',
                  background: 'rgba(0,229,255,0.06)',
                  color: '#00e5ff',
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                ◎ Live Demo
              </a>
            )}

            <button
              onClick={handleShare}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              🔗 Copy Share Link
            </button>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Author</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {item.authorAvatar && (
                <img
                  src={item.authorAvatar}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: '50%' }}
                />
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.author}</div>
                {item.authorUrl && (
                  <a
                    href={item.authorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
                  >
                    View Profile →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {item.liveDemo && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Live Preview</h3>
          <div
            style={{
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)',
              background: '#000',
            }}
          >
            <iframe
              src={item.liveDemo}
              style={{ width: '100%', height: 400, border: 'none' }}
              title="Live Demo"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}

      {item.readme && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Documentation</h3>
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: 24,
              fontSize: 14,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {item.readme}
          </div>
        </div>
      )}
    </div>
  )
}

function LoginModal({
  onLogin,
  onClose,
}: {
  onLogin: (token: string) => void
  onClose: () => void
}) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!token.trim()) {
      setError('Please enter a token')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await onLogin
      await onLogin(token.trim())
    } catch (err) {
      setError('Invalid token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#12121a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 32,
          width: 420,
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>Sign In</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px' }}>
          Paste a GitHub Personal Access Token with <code>repo</code> scope to authenticate.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              GitHub Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#ef4444' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #00e5ff, #00b0ff)',
                color: '#0a0a0f',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
          Generate a token at{' '}
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=Ecosystem"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#00e5ff' }}
          >
            github.com/settings/tokens
          </a>
        </div>
      </div>
    </div>
  )
}
