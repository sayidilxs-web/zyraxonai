import { useState, useEffect, useRef } from 'react'
import { getAuthState, setAuthState, startDeviceFlow, pollDeviceCode, completeDeviceFlowLogin, loginWithToken, logout, getAIConnection } from '../../lib/ecosystem'
import { IconUser, IconSettings, IconLogout, IconRobot, IconLoader, IconKey, IconDeviceCode, IconChevronRight, IconCheck, IconExternalLink, IconCode, IconHeart, IconStar } from './Icons'

interface LoginButtonProps {
  onLogin?: () => void
  onLogout?: () => void
  onNavigate?: (view: string) => void
}

type ModalView = 'closed' | 'choose' | 'token' | 'device' | 'verifying'

export const LoginButton: React.FC<LoginButtonProps> = ({ onLogin, onLogout, onNavigate }) => {
  const [auth, setAuth] = useState(getAuthState())
  const [modalView, setModalView] = useState<ModalView>('closed')
  const [tokenInput, setTokenInput] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [deviceCode, setDeviceCode] = useState('')
  const [deviceUserCode, setDeviceUserCode] = useState('')
  const [deviceVerificationUri, setDeviceVerificationUri] = useState('')
  const [devicePolling, setDevicePolling] = useState(false)
  const [deviceError, setDeviceError] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [aiStatus, setAiStatus] = useState<'connected' | 'connecting' | 'off'>('off')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setAuth(getAuthState())
  }, [])

  useEffect(() => {
    if (!auth.isAuthenticated) return
    try {
      const ai = getAIConnection()
      if (!ai) return
      setAiStatus(ai.connected ? 'connected' : 'connecting')
      const unsub = ai.on?.('status', (s: string) => {
        if (s === 'connected') setAiStatus('connected')
        else if (s === 'connecting') setAiStatus('connecting')
        else setAiStatus('off')
      })
      return () => { if (typeof unsub === 'function') unsub() }
    } catch {
      setAiStatus('off')
    }
  }, [auth.isAuthenticated])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  useEffect(() => {
    if (modalView !== 'closed') {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modalView])

  const handleTokenLogin = async () => {
    if (!tokenInput.trim()) return
    setVerifying(true)
    setTokenError('')
    try {
      const user = await loginWithToken(tokenInput.trim())
      if (user) {
        setAuth(getAuthState())
        setModalView('closed')
        setTokenInput('')
        onLogin?.()
      } else {
        setTokenError('Invalid token. Please check and try again.')
      }
    } catch {
      setTokenError('Failed to verify token. Please try again.')
    }
    setVerifying(false)
  }

  const handleStartDeviceFlow = async () => {
    setDeviceError('')
    setDevicePolling(true)
    try {
      const result = await startDeviceFlow()
      if (result) {
        setDeviceCode(result.device_code)
        setDeviceUserCode(result.user_code)
        setDeviceVerificationUri(result.verification_uri || 'https://github.com/login/device')
        setModalView('device')
        pollDeviceCompletion(result.device_code, result.expires_in || 900)
      } else {
        setDeviceError('Failed to start device flow.')
        setDevicePolling(false)
      }
    } catch {
      setDeviceError('Failed to start device flow.')
      setDevicePolling(false)
    }
  }

  const pollDeviceCompletion = async (code: string, expiresIn: number) => {
    const interval = 5000
    const maxAttempts = Math.ceil(expiresIn / (interval / 1000))
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval))
      try {
        const result = await pollDeviceCode(code)
        if (result && result.access_token) {
          const user = await loginWithToken(result.access_token)
          if (user) {
            setAuth(getAuthState())
            setModalView('closed')
            setDevicePolling(false)
            onLogin?.()
            return
          }
        }
      } catch {}
    }
    setDeviceError('Device code expired. Please try again.')
    setDevicePolling(false)
  }

  const handleLogout = () => {
    logout()
    setAuth(getAuthState())
    setDropdownOpen(false)
    onLogout?.()
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  }

  const modalStyle: React.CSSProperties = {
    background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '440px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#c9d1d9',
    fontSize: '14px',
    fontFamily: 'monospace',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    background: '#238636',
    border: '1px solid #2ea043',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'background 0.15s ease',
  }

  const btnSecondary: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#c9d1d9',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.15s ease',
  }

  if (!auth.isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setModalView('choose')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#238636',
            border: '1px solid #2ea043',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'background 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#2ea043' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#238636' }}
        >
          <IconCode size={16} />
          Login with GitHub
        </button>

        {modalView !== 'closed' && (
          <div style={overlayStyle} onClick={() => setModalView('closed')}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
              {modalView === 'choose' && (
                <div style={{ padding: '32px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #238636, #1a7f37)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}>
                      <IconCode size={28} />
                    </div>
                    <h2 style={{ color: '#c9d1d9', fontSize: '20px', fontWeight: '600', margin: '0 0 8px' }}>
                      Sign in to Zyraxon
                    </h2>
                    <p style={{ color: '#8b949e', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                      Choose how you'd like to authenticate
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                      onClick={() => setModalView('token')}
                      style={{
                        ...btnSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#58a6ff50'
                        e.currentTarget.style.background = 'rgba(88, 166, 255, 0.05)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#30363d'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(88, 166, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <IconKey size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>Personal Access Token</div>
                        <div style={{ fontSize: '12px', color: '#8b949e' }}>Paste a GitHub PAT to sign in</div>
                      </div>
                    </button>

                    <button
                      onClick={handleStartDeviceFlow}
                      disabled={devicePolling}
                      style={{
                        ...btnSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        textAlign: 'left',
                        opacity: devicePolling ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!devicePolling) {
                          e.currentTarget.style.borderColor = '#58a6ff50'
                          e.currentTarget.style.background = 'rgba(88, 166, 255, 0.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#30363d'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(139, 148, 158, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {devicePolling ? <IconLoader size={20} /> : <IconDeviceCode size={20} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                          {devicePolling ? 'Starting...' : 'Device Flow'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8b949e' }}>Authorize from any device</div>
                      </div>
                    </button>
                  </div>

                  {deviceError && (
                    <div style={{
                      marginTop: '16px',
                      padding: '10px 14px',
                      background: 'rgba(248, 81, 73, 0.1)',
                      border: '1px solid rgba(248, 81, 73, 0.3)',
                      borderRadius: '8px',
                      color: '#f85149',
                      fontSize: '13px',
                    }}>
                      {deviceError}
                    </div>
                  )}
                </div>
              )}

              {modalView === 'token' && (
                <div style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <button
                      onClick={() => { setModalView('choose'); setTokenError(''); setTokenInput('') }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#8b949e',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        outline: 'none',
                      }}
                    >
                      <IconChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <h2 style={{ color: '#c9d1d9', fontSize: '18px', fontWeight: '600', margin: 0 }}>
                      Personal Access Token
                    </h2>
                  </div>

                  <div style={{
                    padding: '14px',
                    background: 'rgba(88, 166, 255, 0.05)',
                    border: '1px solid rgba(88, 166, 255, 0.2)',
                    borderRadius: '10px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ color: '#c9d1d9', fontSize: '13px', lineHeight: '1.6' }}>
                      <p style={{ margin: '0 0 8px' }}>To create a token:</p>
                      <ol style={{ margin: '0', paddingLeft: '18px', color: '#8b949e' }}>
                        <li style={{ marginBottom: '4px' }}>
                          Go to{' '}
                          <a
                            href="https://github.com/settings/tokens"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#58a6ff', textDecoration: 'none' }}
                          >
                            github.com/settings/tokens
                          </a>
                        </li>
                        <li style={{ marginBottom: '4px' }}>Click "Generate new token (classic)"</li>
                        <li style={{ marginBottom: '4px' }}>Select scopes: <code style={{
                          background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}>repo</code>, <code style={{
                          background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}>read:user</code></li>
                        <li>Copy the generated token and paste it below</li>
                      </ol>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => { setTokenInput(e.target.value); setTokenError('') }}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      style={inputStyle}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleTokenLogin() }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#30363d' }}
                      autoFocus
                    />
                    {tokenError && (
                      <div style={{ color: '#f85149', fontSize: '12px', marginTop: '8px' }}>
                        {tokenError}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleTokenLogin}
                    disabled={!tokenInput.trim() || verifying}
                    style={{
                      ...btnPrimary,
                      opacity: !tokenInput.trim() || verifying ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {verifying ? (
                      <>
                        <IconLoader size={16} />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <IconCheck size={16} />
                        Sign In
                      </>
                    )}
                  </button>
                </div>
              )}

              {modalView === 'device' && (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'rgba(139, 148, 158, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}>
                      <IconDeviceCode size={28} />
                    </div>
                    <h2 style={{ color: '#c9d1d9', fontSize: '18px', fontWeight: '600', margin: '0 0 8px' }}>
                      Device Authorization
                    </h2>
                    <p style={{ color: '#8b949e', fontSize: '13px', margin: 0 }}>
                      Enter the code below on GitHub to authorize
                    </p>
                  </div>

                  <div style={{
                    padding: '16px',
                    background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
                    border: '2px dashed #30363d',
                    borderRadius: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      fontFamily: 'monospace',
                      color: '#58a6ff',
                      letterSpacing: '4px',
                      wordBreak: 'break-all',
                    }}>
                      {deviceUserCode}
                    </div>
                  </div>

                  <a
                    href={deviceVerificationUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#58a6ff',
                      fontSize: '14px',
                      fontWeight: '500',
                      textDecoration: 'none',
                      marginBottom: '20px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff50' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d' }}
                  >
                    <IconExternalLink size={16} />
                    Open GitHub to Authorize
                  </a>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#8b949e',
                    fontSize: '13px',
                  }}>
                    <IconLoader size={14} />
                    Waiting for authorization...
                  </div>

                  {deviceError && (
                    <div style={{
                      marginTop: '16px',
                      padding: '10px 14px',
                      background: 'rgba(248, 81, 73, 0.1)',
                      border: '1px solid rgba(248, 81, 73, 0.3)',
                      borderRadius: '8px',
                      color: '#f85149',
                      fontSize: '13px',
                    }}>
                      {deviceError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  const user = auth.user!

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 8px 4px 4px',
          background: dropdownOpen ? '#21262d' : 'transparent',
          border: '1px solid',
          borderColor: dropdownOpen ? '#30363d' : 'transparent',
          borderRadius: '10px',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d' }}
        onMouseLeave={(e) => { if (!dropdownOpen) e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
          }}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b949e',
              }}>
                <IconUser size={16} />
              </div>
            )}
          </div>
          <div style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: aiStatus === 'connected' ? '#3fb950' : aiStatus === 'connecting' ? '#d29922' : '#484f58',
            border: '2px solid #161b22',
          }} />
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          lineHeight: '1.2',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#c9d1d9' }}>
            {user.displayName || user.username}
          </span>
          <span style={{ fontSize: '11px', color: '#8b949e' }}>
            {aiStatus === 'connected' ? 'AI Connected' : aiStatus === 'connecting' ? 'AI Connecting...' : 'AI Off'}
          </span>
        </div>
      </button>

      {dropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          width: '240px',
          background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '12px',
          padding: '6px',
          zIndex: 50,
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
        }}>
          <div style={{
            padding: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '4px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#c9d1d9' }}>
              {user.displayName || user.username}
            </div>
            <div style={{ fontSize: '12px', color: '#8b949e' }}>@{user.username}</div>
          </div>

          <button
            onClick={() => { onNavigate?.('profile'); setDropdownOpen(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#c9d1d9',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
              textAlign: 'left',
              outline: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconUser size={16} />
            My Profile
          </button>

          <button
            onClick={() => { onNavigate?.('my-plugins'); setDropdownOpen(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#c9d1d9',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
              textAlign: 'left',
              outline: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconStar size={16} />
            My Published Items
          </button>

          <button
            onClick={() => { onNavigate?.('my-favorites'); setDropdownOpen(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#c9d1d9',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
              textAlign: 'left',
              outline: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconHeart size={16} />
            My Likes
          </button>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />

          <button
            onClick={() => { onNavigate?.('ai-settings'); setDropdownOpen(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#c9d1d9',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
              textAlign: 'left',
              outline: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconRobot size={16} />
            AI Settings
          </button>

          <button
            onClick={() => { onNavigate?.('settings'); setDropdownOpen(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#c9d1d9',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
              textAlign: 'left',
              outline: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconSettings size={16} />
            Settings
          </button>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#f85149',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
              textAlign: 'left',
              outline: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248, 81, 73, 0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconLogout size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
