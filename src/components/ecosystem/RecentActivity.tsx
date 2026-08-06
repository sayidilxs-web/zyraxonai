import React from 'react'
import { RecentActivity as RecentActivityType } from '../../lib/ecosystem'
import { IconPackage, IconRobot, IconTemplate, IconUser, IconDownload } from './Icons'

interface RecentActivityProps {
  activities: RecentActivityType[]
  loading?: boolean
}

const formatTimeAgo = (timestamp: string): string => {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = now - then
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (months > 0) return `${months}mo ago`
  if (weeks > 0) return `${weeks}w ago`
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

const activityIcons: Record<string, React.FC<{ size?: number; className?: string }>> = {
  plugin: IconPackage,
  bot: IconRobot,
  template: IconTemplate,
  model: IconPackage,
  tool: IconPackage,
  sdk: IconPackage,
  api: IconPackage,
  app: IconPackage,
  extension: IconPackage,
  cli: IconPackage,
  prompt: IconPackage,
  dataset: IconPackage,
  icon: IconPackage,
  'ui-kit': IconPackage,
  'landing-page': IconPackage,
  workflow: IconPackage,
  pdf: IconPackage,
  book: IconPackage,
  component: IconPackage,
  theme: IconPackage,
  startkit: IconPackage,
  'desktop-app': IconPackage,
  iso: IconPackage,
  font: IconPackage,
  snippet: IconPackage,
  devops: IconPackage,
}

const activityColors: Record<string, string> = {
  plugin: '#58a6ff',
  bot: '#a855f7',
  template: '#34d399',
  model: '#f59e0b',
  tool: '#8b949e',
  sdk: '#8b949e',
  api: '#8b949e',
  app: '#8b949e',
  extension: '#8b949e',
  cli: '#8b949e',
}

const SkeletonActivity: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
      flexShrink: 0,
    }} />
    <div style={{ flex: 1 }}>
      <div style={{
        width: '70%',
        height: '14px',
        borderRadius: '4px',
        background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
        marginBottom: '6px',
      }} />
      <div style={{
        width: '40%',
        height: '12px',
        borderRadius: '4px',
        background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
      }} />
    </div>
    <div style={{
      width: '50px',
      height: '12px',
      borderRadius: '4px',
      background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
    }} />
  </div>
)

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities, loading }) => {
  if (loading) {
    return (
      <div style={{
        background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '16px',
      }}>
        <div style={{
          fontSize: '15px',
          fontWeight: '600',
          color: '#c9d1d9',
          marginBottom: '12px',
        }}>Recent Activity</div>
        <SkeletonActivity />
        <SkeletonActivity />
        <SkeletonActivity />
        <SkeletonActivity />
        <SkeletonActivity />
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '16px',
    }}>
      <div style={{
        fontSize: '15px',
        fontWeight: '600',
        color: '#c9d1d9',
        marginBottom: '12px',
      }}>Recent Activity</div>

      {activities.length === 0 ? (
        <div style={{
          padding: '24px 0',
          textAlign: 'center',
          color: '#8b949e',
          fontSize: '13px',
        }}>
          No recent activity
        </div>
      ) : (
        <div>
          {activities.map((activity) => {
            const IconComp = activityIcons[activity.type] || IconPackage
            const color = activityColors[activity.type] || '#58a6ff'
            return (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {activity.authorAvatar ? (
                  <img
                    src={activity.authorAvatar}
                    alt={activity.author}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color,
                    flexShrink: 0,
                  }}>
                    <IconComp size={18} />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#c9d1d9',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ fontWeight: '600' }}>{activity.author}</span>
                    <span style={{ color: '#8b949e' }}> published </span>
                    <span style={{ fontWeight: '500', color: '#58a6ff' }}>{activity.name}</span>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#8b949e',
                    marginTop: '2px',
                    textTransform: 'capitalize',
                  }}>
                    {activity.type}
                  </div>
                </div>

                <div style={{
                  fontSize: '12px',
                  color: '#8b949e',
                  flexShrink: 0,
                }}>
                  {formatTimeAgo(activity.timestamp)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
