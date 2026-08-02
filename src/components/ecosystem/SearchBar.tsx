import React, { useEffect, useRef, useState } from 'react'
import { IconSearch, IconX } from './Icons'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = 'Search plugins, bots, templates...' }) => {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setQuery('')
        onSearch('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSearch])

  const handleChange = (value: string) => {
    setQuery(value)
    onSearch(value)
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '600px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        background: '#161b22',
        border: `1px solid ${focused ? '#58a6ff' : '#21262d'}`,
        borderRadius: '10px',
        transition: 'all 0.2s ease',
        boxShadow: focused ? '0 0 0 3px rgba(88, 166, 255, 0.1)' : 'none',
      }}>
        <IconSearch size={18} className="" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#c9d1d9',
            fontSize: '14px',
            fontFamily: 'inherit',
          }}
        />
        {query ? (
          <button
            onClick={() => { setQuery(''); onSearch('') }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px',
            }}
          >
            <IconX size={14} />
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: '#8b949e',
            flexShrink: 0,
          }}>
            <kbd style={{
              padding: '2px 6px',
              background: '#21262d',
              border: '1px solid #30363d',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'inherit',
            }}>Ctrl</kbd>
            <kbd style={{
              padding: '2px 6px',
              background: '#21262d',
              border: '1px solid #30363d',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'inherit',
            }}>K</kbd>
          </div>
        )}
      </div>
    </div>
  )
}
