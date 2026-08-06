/**
 * ZYRAXON AI — MCP Tool Detail Component
 * 
 * Detailed view of an MCP tool showing all information including
 * installation instructions, configuration, capabilities, and
 * how to connect it to the ZYRAXON AI application.
 */

import React, { useState, useCallback } from 'react';
import { MCPTool, formatMCPStats, generateMCPConfig } from '../../lib/mcp-tools-api';
import { InstallButton } from './InstallButton';
import { SecurityBadge } from './SecurityBadge';
import { ShareButton } from './ShareButton';
import { CommentSection } from './CommentSection';
import { RatingStars } from './RatingStars';
import { LikeButton } from './LikeButton';

interface MCPToolDetailProps {
  tool: MCPTool;
  onClose: () => void;
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

export const MCPToolDetail: React.FC<MCPToolDetailProps> = ({ tool, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'install' | 'config'>('details');
  const stats = formatMCPStats(tool);
  const mcpConfig = generateMCPConfig(tool);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(13,17,23,0.55)',
      backdropFilter: 'blur(24px)',
      zIndex: 999,
      overflow: 'auto',
    }}>
      {/* Header Bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(28,34,46,0.55)',
        backdropFilter: 'blur(20px)',
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
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#c9d1d9' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div style={{ flex: 1 }} />

        <ShareButton itemId={tool.id} itemName={tool.displayName} />

        {tool.repository && (
          <a
            href={tool.repository}
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
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8b949e' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c6.626 0 12 5.373 12 12 0 5.302-3.438 9.8-8.207 11.387-.599.111-.793-.261-.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Source Code
          </a>
        )}

        <InstallButton
          target={{
            id: tool.id,
            displayName: tool.displayName,
            version: tool.version,
            publisher: tool.author,
            icon: tool.icon,
            source: 'mcp',
          }}
          size="md"
        />
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Tool Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '24px',
          marginBottom: '32px',
        }}>
          {tool.icon ? (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '3px solid #21262d',
              background: 'rgba(28,34,46,0.55)',
              backdropFilter: 'blur(20px)',
              flexShrink: 0,
            }}>
              <img src={tool.icon} alt={tool.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${getSourceColor(tool.source)}22, ${getSourceColor(tool.source)}44)`,
              border: `2px solid ${getSourceColor(tool.source)}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke={getSourceColor(tool.source)} strokeWidth="2" fill="none" />
                <circle cx="12" cy="8" r="2" fill={getSourceColor(tool.source)} />
                <circle cx="8" cy="14" r="2" fill={getSourceColor(tool.source)} />
                <circle cx="16" cy="14" r="2" fill={getSourceColor(tool.source)} />
              </svg>
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                {tool.displayName}
              </h1>
              {tool.featured && (
                <span style={{
                  padding: '4px 8px',
                  background: 'rgba(227, 179, 65, 0.15)',
                  border: '1px solid rgba(227, 179, 65, 0.3)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#e3b341',
                }}>
                  ⭐ Featured
                </span>
              )}
              {tool.trending && (
                <span style={{
                  padding: '4px 8px',
                  background: 'rgba(240, 136, 62, 0.15)',
                  border: '1px solid rgba(240, 136, 62, 0.3)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#f0883e',
                }}>
                  🔥 Trending
                </span>
              )}
            </div>

            <div style={{ fontSize: '14px', color: '#8b949e', marginBottom: '12px' }}>
              by <span style={{ color: '#58a6ff' }}>{tool.author}</span>
              {tool.authorVerified && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#58a6ff" style={{ marginLeft: '4px', verticalAlign: 'middle' }}>
                  <path d="M12 1l2.6 2.1 3.3-.3.9 3.2 2.9 1.7-1.4 3 1.4 3-2.9 1.7-.9 3.2-3.3.3L12 23l-2.6-2.1-3.3.3-.9-3.2L2.3 16l1.4-3-1.4-3 2.9-1.7.9-3.2 3.3.3z" />
                  <path d="M10.6 15.4l-2.8-2.8 1.2-1.2 1.6 1.6 4-4 1.2 1.2z" fill="#0d1117" />
                </svg>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: `${getSourceColor(tool.source)}15`,
                border: `1px solid ${getSourceColor(tool.source)}40`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: getSourceColor(tool.source),
                textTransform: 'uppercase',
              }}>
                {tool.source}
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: `${getTransportColor(tool.transport)}15`,
                border: `1px solid ${getTransportColor(tool.transport)}40`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: getTransportColor(tool.transport),
                textTransform: 'uppercase',
              }}>
                {tool.transport}
              </span>
              <span style={{ fontSize: '13px', color: '#8b949e' }}>
                v{tool.version}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {[
            { label: 'Downloads', value: formatNumber(tool.downloads), color: '#58a6ff' },
            { label: 'Rating', value: `${tool.rating.toFixed(1)} ⭐`, color: '#e3b341' },
            { label: 'Protocol', value: tool.protocol.toUpperCase(), color: '#3fb950' },
            { label: 'Transport', value: tool.transport, color: getTransportColor(tool.transport) },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: '16px',
              background: 'rgba(28,34,46,0.55)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: stat.color, marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '4px',
        }}>
          {(['details', 'install', 'config'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab ? 'rgba(137, 87, 229, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                color: activeTab === tab ? '#8957e5' : '#8b949e',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.15s ease',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px' }}>
          <div>
            {activeTab === 'details' && (
              <>
                <div style={{
                  fontSize: '15px',
                  color: '#c9d1d9',
                  lineHeight: '1.7',
                  marginBottom: '24px',
                  whiteSpace: 'pre-wrap',
                }}>
                  {tool.description}
                </div>

                {tool.capabilities.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 12px' }}>
                      Capabilities
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {tool.capabilities.map((cap) => (
                        <span key={cap} style={{
                          padding: '6px 12px',
                          background: 'rgba(137, 87, 229, 0.1)',
                          border: '1px solid rgba(137, 87, 229, 0.2)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#a371f7',
                        }}>
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {tool.tags.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 12px' }}>
                      Tags
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {tool.tags.map((tag) => (
                        <span key={tag} style={{
                          padding: '6px 12px',
                          background: 'rgba(48,54,61,0.45)',
                          backdropFilter: 'blur(14px)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '20px',
                          fontSize: '13px',
                          color: '#8b949e',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'install' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 16px' }}>
                  Installation
                </h3>
                <div style={{
                  padding: '16px',
                  background: 'rgba(13,17,23,0.55)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Install Command
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    background: 'rgba(22,27,34,0.9)',
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
                      {tool.installCommand}
                    </code>
                    <button
                      onClick={() => copyToClipboard(tool.installCommand)}
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
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  background: 'rgba(28,34,46,0.55)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 12px' }}>
                    How to Install in ZYRAXON AI
                  </h4>
                  <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#8b949e', lineHeight: '1.8' }}>
                    <li>Click the "Install" button above</li>
                    <li>ZYRAXON AI will open automatically</li>
                    <li>The MCP tool will be configured and ready to use</li>
                    <li>Restart ZYRAXON AI if prompted</li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === 'config' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 16px' }}>
                  MCP Configuration
                </h3>
                <div style={{
                  padding: '16px',
                  background: 'rgba(13,17,23,0.55)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    JSON Configuration
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    background: 'rgba(22,27,34,0.9)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                  }}>
                    <pre style={{
                      flex: 1,
                      margin: 0,
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#c9d1d9',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {mcpConfig}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(mcpConfig)}
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
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: '72px', alignSelf: 'start' }}>
            <div style={{
              background: 'rgba(28,34,46,0.55)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  padding: '10px',
                  background: 'rgba(13,17,23,0.55)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#c9d1d9' }}>
                    {formatNumber(tool.downloads)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#484f58', marginTop: '2px' }}>Downloads</div>
                </div>
                <div style={{
                  padding: '10px',
                  background: 'rgba(13,17,23,0.55)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d29922', fontSize: '14px', fontWeight: '600' }}>
                    ⭐ {tool.rating.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#484f58', marginTop: '2px' }}>Rating</div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: '13px',
              }}>
                <span style={{ color: '#8b949e' }}>Updated</span>
                <span style={{ color: '#c9d1d9' }}>{formatDate(tool.lastUpdated)}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: '13px',
              }}>
                <span style={{ color: '#8b949e' }}>License</span>
                <span style={{ color: '#c9d1d9' }}>{tool.license || 'MIT'}</span>
              </div>

              <div style={{ marginTop: '16px' }}>
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
                  detailed
                />
              </div>

              <div style={{ marginTop: '16px' }}>
                <LikeButton itemId={tool.id} initialLikeCount={0} />
              </div>

              <div style={{ marginTop: '16px' }}>
                <RatingStars itemId={tool.id} initialAverage={tool.rating} />
              </div>
            </div>

            {/* Comments */}
            <div style={{
              background: 'rgba(28,34,46,0.55)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 12px' }}>
                Comments
              </h4>
              <CommentSection itemId={tool.id} comments={[]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPToolDetail;
