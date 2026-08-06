import React, { useState } from 'react'
import {
  IconHome, IconMarketplace, IconCommunity, IconSearch, IconCategories,
  IconStar, IconTrending, IconNew, IconPackage, IconDownload, IconHeart,
  IconSettings, IconChevronLeft, IconChevronRight, IconUser, IconMCP,
} from './Icons'

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
}

interface NavItem {
  id: string
  label: string
  icon: React.FC<{ size?: number; className?: string }>
}

const mainNavItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: IconHome },
  { id: 'marketplace', label: 'Marketplace', icon: IconMarketplace },
  { id: 'mcp', label: 'MCP Tools', icon: IconMCP },
  { id: 'vscode', label: 'Extensions', icon: IconPackage },
  { id: 'github', label: 'GitHub Releases', icon: IconDownload },
  { id: 'explore', label: 'Explore', icon: IconSearch },
  { id: 'categories', label: 'Categories', icon: IconCategories },
  { id: 'top-rated', label: 'Top Rated', icon: IconStar },
  { id: 'trending', label: 'Trending', icon: IconTrending },
  { id: 'new', label: 'New Arrivals', icon: IconNew },
]

const myStuffItems: NavItem[] = [
  { id: 'my-plugins', label: 'My Plugins', icon: IconPackage },
  { id: 'my-downloads', label: 'My Downloads', icon: IconDownload },
  { id: 'my-favorites', label: 'My Favorites', icon: IconHeart },
]

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const [collapsed, setCollapsed] = useState(false)

  const navButtonStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: collapsed ? '10px' : '10px 12px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    background: active ? 'rgba(31, 111, 235, 0.2)' : 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: active ? '#58a6ff' : '#8b949e',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: active ? '600' : '400',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    outline: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  })

  const labelStyle: React.CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    opacity: collapsed ? 0 : 1,
    width: collapsed ? 0 : 'auto',
    transition: 'opacity 0.15s ease',
  }

  return (
    <div style={{
      width: collapsed ? '56px' : '224px',
      minWidth: collapsed ? '56px' : '224px',
      height: '100vh',
      background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '16px 8px' : '16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {!collapsed && (
          <span style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#c9d1d9',
            fontFamily: 'inherit',
          }}>
            Ecosystem
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            color: '#8b949e',
            cursor: 'pointer',
            flexShrink: 0,
            outline: 'none',
          }}
        >
          {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: collapsed ? '8px' : '8px',
      }}>
        <div style={{ marginBottom: '8px' }}>
          {!collapsed && (
            <div style={{
              padding: '8px 12px 4px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#484f58',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Browse
            </div>
          )}
          {mainNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={navButtonStyle(currentView === item.id)}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              <span style={labelStyle}>{item.label}</span>
            </button>
          ))}
        </div>

        <div style={{ height: '1px', background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)', margin: '8px 12px' }} />

        <div>
          {!collapsed && (
            <div style={{
              padding: '8px 12px 4px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#484f58',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              My Stuff
            </div>
          )}
          {myStuffItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={navButtonStyle(currentView === item.id)}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              <span style={labelStyle}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{
        padding: collapsed ? '8px' : '12px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={() => onViewChange('settings')}
          style={navButtonStyle(currentView === 'settings')}
          title={collapsed ? 'Settings' : undefined}
        >
          <IconSettings size={18} />
          <span style={labelStyle}>Settings</span>
        </button>
      </div>
    </div>
  )
}
