import React from 'react'
import { CategoryInfo } from '../../lib/ecosystem'
import {
  IconRobot, IconExtension, IconTemplate, IconPackage, IconMonitor,
  IconSmartphone, IconCpu, IconTerminal, IconGlobe, IconPalette,
  IconLayers, IconBox, IconRocket, IconFileText, IconBook,
  IconMessageSquare, IconDatabase, IconCode, IconImage, IconBolt,
  IconType, IconDisc, IconLayout, IconTrending, IconHome
} from './Icons'

interface CategoryCardProps {
  category: CategoryInfo
  onClick: () => void
}

const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  bot: IconRobot,
  puzzle: IconExtension,
  layout: IconLayout,
  palette: IconPalette,
  box: IconBox,
  monitor: IconMonitor,
  smartphone: IconSmartphone,
  cpu: IconCpu,
  wrench: IconBolt,
  terminal: IconTerminal,
  package: IconPackage,
  type: IconType,
  disc: IconDisc,
  rocket: IconRocket,
  'file-text': IconFileText,
  book: IconBook,
  message: IconMessageSquare,
  database: IconDatabase,
  code: IconCode,
  globe: IconGlobe,
  extension: IconExtension,
  layers: IconLayers,
  image: IconImage,
  zap: IconBolt,
  file: IconFileText,
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  const IconComponent = iconMap[category.icon] || IconBox

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '20px',
        background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'left',
        width: '100%',
        outline: 'none',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#58a6ff'
        e.currentTarget.style.background = '#1c2128'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#21262d'
        e.currentTarget.style.background = '#161b22'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: 'rgba(88, 166, 255, 0.1)',
        color: '#58a6ff',
      }}>
        <IconComponent size={22} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}>
          <span style={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#c9d1d9',
          }}>
            {category.name}
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#8b949e',
            background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
            padding: '2px 8px',
            borderRadius: '10px',
          }}>
            {category.count}
          </span>
        </div>
        <div style={{
          fontSize: '13px',
          color: '#8b949e',
          lineHeight: '1.4',
        }}>
          {category.description}
        </div>
      </div>
    </button>
  )
}
