/**
 * ZYRAXON AI — MCP Tools Page Component
 * 
 * Main page for browsing and discovering MCP tools from the world's
 * largest MCP registries. Shows featured tools, trending tools, and
 * allows searching and filtering by source, category, and transport type.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  searchMCPTools,
  getFeaturedMCPTools,
  getTrendingMCPTools,
  type MCPTool,
  type MCPSearchResult,
} from '../../lib/mcp-tools-api';
import { MCPToolCard } from './MCPToolCard';
import { MCPToolDetail } from './MCPToolDetail';

const CATEGORIES = [
  'All', 'AI', 'Data', 'Development', 'Productivity', 'Communication',
  'Finance', 'Health', 'Education', 'Entertainment', 'Other',
];

const SOURCES = [
  { id: 'all', label: 'All Sources', color: '#8b949e' },
  { id: 'smithery', label: 'Smithery', color: '#8957e5' },
  { id: 'github', label: 'GitHub', color: '#c9d1d9' },
  { id: 'glama', label: 'Glama', color: '#58a6ff' },
];

const TRANSPORTS = [
  { id: 'all', label: 'All', color: '#8b949e' },
  { id: 'stdio', label: 'Stdio', color: '#3fb950' },
  { id: 'sse', label: 'SSE', color: '#58a6ff' },
  { id: 'streamable-http', label: 'HTTP', color: '#a371f7' },
];

const SORTS = [
  { id: 'downloads', label: 'Most Downloads' },
  { id: 'rating', label: 'Highest Rated' },
  { id: 'trending', label: 'Trending' },
  { id: 'newest', label: 'Newest' },
  { id: 'name', label: 'Name' },
];

interface MCPToolsPageProps {
  onSelectTool?: (tool: MCPTool) => void;
}

export const MCPToolsPage: React.FC<MCPToolsPageProps> = ({ onSelectTool }) => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedTransport, setSelectedTransport] = useState('all');
  const [sortBy, setSortBy] = useState('downloads');
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadTools = useCallback(async () => {
    setLoading(true);
    try {
      let result: MCPSearchResult;

      if (searchQuery) {
        result = await searchMCPTools(searchQuery, {
          source: selectedSource as any,
          pageSize: 100,
        });
      } else {
        result = await searchMCPTools(undefined, {
          source: selectedSource as any,
          pageSize: 100,
        });
      }

      let filteredTools = result.tools;

      // Filter by category
      if (selectedCategory !== 'All') {
        filteredTools = filteredTools.filter((t) =>
          t.categories.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()))
        );
      }

      // Filter by transport
      if (selectedTransport !== 'all') {
        filteredTools = filteredTools.filter((t) => t.transport === selectedTransport);
      }

      // Sort
      filteredTools.sort((a, b) => {
        switch (sortBy) {
          case 'downloads':
            return b.downloads - a.downloads;
          case 'rating':
            return b.rating - a.rating;
          case 'trending':
            return (b.trending ? 1 : 0) - (a.trending ? 1 : 0);
          case 'newest':
            return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
          case 'name':
            return a.displayName.localeCompare(b.displayName);
          default:
            return 0;
        }
      });

      setTools(filteredTools);
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
    }
    setLoading(false);
  }, [searchQuery, selectedCategory, selectedSource, selectedTransport, sortBy]);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const handleToolClick = (tool: MCPTool) => {
    setSelectedTool(tool);
    setShowDetail(true);
    if (onSelectTool) onSelectTool(tool);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedTool(null);
  };

  if (showDetail && selectedTool) {
    return <MCPToolDetail tool={selectedTool} onClose={handleCloseDetail} />;
  }

  return (
    <div style={{ color: '#c9d1d9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(1200px 400px at 15% -10%, rgba(137,87,229,0.22), transparent 60%), radial-gradient(1000px 400px at 90% -20%, rgba(137,87,229,0.18), transparent 55%), linear-gradient(160deg, #161b22 0%, #0d1117 55%, #1a1025 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '44px 0 34px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 20, background: 'rgba(137,87,229,0.15)', border: '1px solid rgba(137,87,229,0.35)', color: '#a371f7', fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: '0.3px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8957e5', boxShadow: '0 0 10px rgba(137,87,229,0.9)' }} />
            MODEL CONTEXT PROTOCOL
          </div>
          <h1 style={{ fontSize: '34px', fontWeight: '800', color: '#f0f6fc', marginBottom: '8px', letterSpacing: '-0.5px', background: 'linear-gradient(120deg, #f0f6fc 30%, #b39bf0 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MCP Tools Hub
          </h1>
          <p style={{ fontSize: '16px', color: '#8b949e', marginBottom: '24px' }}>
            Discover and install MCP tools from the world's largest registries — connect AI models to external tools and data
          </p>
          <div style={{ display: 'flex', gap: '36px', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Tools', value: tools.length, color: '#58a6ff' },
              { label: 'Smithery', value: tools.filter((t) => t.source === 'smithery').length, color: '#8957e5' },
              { label: 'GitHub', value: tools.filter((t) => t.source === 'github').length, color: '#c9d1d9' },
              { label: 'Glama', value: tools.filter((t) => t.source === 'glama').length, color: '#58a6ff' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '26px', fontWeight: '800', color: stat.color, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: '#8b949e' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Search and Sort */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e', fontSize: '14px' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search MCP tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: 'rgba(28,34,46,0.55)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: '#c9d1d9',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#8957e5' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '10px 12px',
              background: 'rgba(28,34,46,0.55)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#c9d1d9',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {SORTS.map((sort) => (
              <option key={sort.id} value={sort.id}>{sort.label}</option>
            ))}
          </select>
        </div>

        {/* Source Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}>
          {SOURCES.map((source) => (
            <button
              key={source.id}
              onClick={() => setSelectedSource(source.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: selectedSource === source.id ? source.color : '#30363d',
                background: selectedSource === source.id ? `${source.color}22` : 'transparent',
                color: selectedSource === source.id ? source.color : '#8b949e',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {source.label}
            </button>
          ))}
        </div>

        {/* Transport Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}>
          {TRANSPORTS.map((transport) => (
            <button
              key={transport.id}
              onClick={() => setSelectedTransport(transport.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: selectedTransport === transport.id ? transport.color : '#30363d',
                background: selectedTransport === transport.id ? `${transport.color}22` : 'transparent',
                color: selectedTransport === transport.id ? transport.color : '#8b949e',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {transport.label}
            </button>
          ))}
        </div>

        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          padding: '16px',
          background: 'rgba(28,34,46,0.55)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
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
                borderColor: selectedCategory === cat ? '#8957e5' : '#30363d',
                background: selectedCategory === cat ? 'rgba(137, 87, 229, 0.15)' : 'transparent',
                color: selectedCategory === cat ? '#8957e5' : '#8b949e',
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

        {/* Loading State */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{
              width: '40px', height: '40px', border: '3px solid #21262d',
              borderTopColor: '#8957e5', borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : tools.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#8b949e' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 8px' }}>
              No MCP tools found
            </h3>
            <p style={{ fontSize: '14px', margin: 0 }}>
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          /* Tools Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
          }}>
            {tools.map((tool) => (
              <MCPToolCard
                key={tool.id}
                tool={tool}
                onClick={handleToolClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MCPToolsPage;
