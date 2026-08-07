/**
 * ZYRAXON AI — MCP Tool Card Component
 * 
 * Displays an individual MCP tool with its details, similar to
 * how extensions are displayed but with MCP-specific information
 * like capabilities, transport type, and installation command.
 */

import React, { useState, useCallback } from 'react';
import { MCPTool, formatMCPStats, generateMCPConfig } from '../../lib/mcp-tools-api';
import { InstallButton } from './InstallButton';
import { SecurityBadge } from './SecurityBadge';
import { ShareButton } from './ShareButton';

interface MCPToolCardProps {
  tool: MCPTool;
  onClick?: (tool: MCPTool) => void;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const getTransportColor = (transport: string): string => {
  switch (transport) {
    case 'stdio': return '#3fb950';
    case 'sse': return '#58a6ff';
    case 'streamable-http': return '#a371f7';
    default: return '#8b949e';
  }
};

const getSourceColor = (source: string): string => {
  switch (source) {
    case 'smithery': return '#8957e5';
    case 'github': return '#c9d1d9';
    case 'glama': return '#58a6ff';
    case 'mcpso': return '#3fb950';
    default: return '#8b949e';
  }
};

export const MCPToolCard: React.FC<MCPToolCardProps> = ({ tool, onClick }) => {
  const [copied, setCopied] = useState(false);
  const stats = formatMCPStats(tool);

  const copyInstallCommand = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(tool.installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = tool.installCommand;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [tool.installCommand]);

  const handleCardClick = () => {
    if (onClick) onClick(tool);
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        background: 'rgba(28,34,46,0.55)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#8957e5';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(137,87,229,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          {tool.icon ? (
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'rgba(48,54,61,0.45)',
              backdropFilter: 'blur(14px)',
            }}>
              <img
                src={tool.icon}
                alt={tool.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${getSourceColor(tool.source)}22, ${getSourceColor(tool.source)}44)`,
              border: `1px solid ${getSourceColor(tool.source)}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke={getSourceColor(tool.source)} strokeWidth="2" fill="none" />
                <circle cx="12" cy="8" r="2" fill={getSourceColor(tool.source)} />
                <circle cx="8" cy="14" r="2" fill={getSourceColor(tool.source)} />
                <circle cx="16" cy="14" r="2" fill={getSourceColor(tool.source)} />
              </svg>
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#c9d1d9',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {tool.displayName}
              </span>
              {tool.featured && (
                <span style={{
                  padding: '2px 6px',
                  background: 'rgba(227, 179, 65, 0.15)',
                  border: '1px solid rgba(227, 179, 65, 0.3)',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#e3b341',
                  textTransform: 'uppercase',
                }}>
                  Featured
                </span>
              )}
              {tool.trending && (
                <span style={{
                  padding: '2px 6px',
                  background: 'rgba(240, 136, 62, 0.15)',
                  border: '1px solid rgba(240, 136, 62, 0.3)',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#f0883e',
                  textTransform: 'uppercase',
                }}>
                  Trending
                </span>
              )}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#8b949e',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>by {tool.author}</span>
              {tool.authorVerified && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#58a6ff">
                  <path d="M12 1l2.6 2.1 3.3-.3.9 3.2 2.9 1.7-1.4 3 1.4 3-2.9 1.7-.9 3.2-3.3.3L12 23l-2.6-2.1-3.3.3-.9-3.2L2.3 16l1.4-3-1.4-3 2.9-1.7.9-3.2 3.3.3z" />
                  <path d="M10.6 15.4l-2.8-2.8 1.2-1.2 1.6 1.6 4-4 1.2 1.2z" fill="#0d1117" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Source Badge */}
        <div style={{
          padding: '3px 8px',
          background: `${getSourceColor(tool.source)}15`,
          border: `1px solid ${getSourceColor(tool.source)}40`,
          borderRadius: '6px',
          fontSize: '10px',
          fontWeight: '600',
          color: getSourceColor(tool.source),
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          {tool.source}
        </div>
      </div>

      {/* Description */}
      <div style={{
        fontSize: '13px',
        color: '#8b949e',
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {tool.description}
      </div>

      {/* Tags/Capabilities */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
      }}>
        {tool.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            style={{
              padding: '2px 8px',
              background: 'rgba(48,54,61,0.45)',
              backdropFilter: 'blur(14px)',
              borderRadius: '10px',
              fontSize: '11px',
              color: '#8b949e',
            }}
          >
            {tag}
          </span>
        ))}
        {tool.tags.length > 3 && (
          <span style={{
            padding: '2px 8px',
            background: 'rgba(48,54,61,0.45)',
            backdropFilter: 'blur(14px)',
            borderRadius: '10px',
            fontSize: '11px',
            color: '#484f58',
          }}>
            +{tool.tags.length - 3}
          </span>
        )}
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '12px',
        color: '#8b949e',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {formatNumber(tool.downloads)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#e3b341">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {tool.rating.toFixed(1)}
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 6px',
          background: `${getTransportColor(tool.transport)}15`,
          border: `1px solid ${getTransportColor(tool.transport)}40`,
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '600',
          color: getTransportColor(tool.transport),
          textTransform: 'uppercase',
        }}>
          {tool.transport}
        </span>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: 'auto',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <InstallButton
          target={{
            id: tool.id,
            displayName: tool.displayName,
            version: tool.version,
            publisher: tool.author,
            icon: tool.icon,
            source: 'mcp',
          }}
          size="sm"
        />

        <button
          onClick={copyInstallCommand}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            background: copied ? 'rgba(63, 185, 80, 0.1)' : 'rgba(48,54,61,0.45)',
            border: `1px solid ${copied ? 'rgba(63, 185, 80, 0.3)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '6px',
            color: copied ? '#3fb950' : '#8b949e',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
        >
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 1.042-.018.751.751 0 0 1 .018 1.042L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25v-7.5z" />
              <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25v-7.5zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-7.5z" />
            </svg>
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>

        <div style={{ marginLeft: 'auto' }}>
          <SecurityBadge
            input={{
              id: tool.id,
              verifiedPublisher: tool.authorVerified,
              repository: tool.repository,
              license: tool.license,
              installs: tool.downloads,
              rating: tool.rating,
              ratingCount: tool.ratingCount,
              lastUpdated: tool.lastUpdated,
              tags: tool.tags,
              capabilities: tool.capabilities,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MCPToolCard;
