import React from 'react'
import { EcosystemStats } from '../../lib/ecosystem'
import { IconDownload, IconPackage, IconRobot, IconTemplate, IconUser } from './Icons'

interface StatsCardProps {
  stats: EcosystemStats | null
  loading?: boolean
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const StatItem: React.FC<{
  icon: React.ReactNode
  label: string
  value: number
}> = ({ icon, label, value }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    flex: '1 1 0',
    minWidth: '160px',
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      background: 'rgba(88, 166, 255, 0.1)',
      color: '#58a6ff',
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#c9d1d9',
        lineHeight: '1.2',
      }}>
        {formatNumber(value)}
      </div>
      <div style={{
        fontSize: '13px',
        color: '#8b949e',
        marginTop: '2px',
      }}>
        {label}
      </div>
    </div>
  </div>
)

const SkeletonItem: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    flex: '1 1 0',
    minWidth: '160px',
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      background: 'linear-gradient(90deg, #21262d 25%, #30363d 50%, #21262d 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
    }} />
    <div style={{ flex: 1 }}>
      <div style={{
        width: '60px',
        height: '24px',
        borderRadius: '4px',
        background: 'linear-gradient(90deg, #21262d 25%, #30363d 50%, #21262d 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        marginBottom: '6px',
      }} />
      <div style={{
        width: '80px',
        height: '13px',
        borderRadius: '4px',
        background: 'linear-gradient(90deg, #21262d 25%, #30363d 50%, #21262d 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }} />
    </div>
  </div>
)

export const StatsCard: React.FC<StatsCardProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </div>
      </>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <StatItem icon={<IconDownload size={20} />} label="Downloads" value={stats.totalDownloads} />
      <StatItem icon={<IconPackage size={20} />} label="Plugins" value={stats.totalPlugins} />
      <StatItem icon={<IconRobot size={20} />} label="Bots" value={stats.totalBots} />
      <StatItem icon={<IconTemplate size={20} />} label="Templates" value={stats.totalTemplates} />
      <StatItem icon={<IconUser size={20} />} label="Users" value={stats.totalUsers} />
    </div>
  )
}
