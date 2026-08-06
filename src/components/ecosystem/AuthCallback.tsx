import { useState, useEffect } from 'react'
import { startDeviceFlow, pollDeviceCode, completeDeviceFlowLogin, handleGitHubCallback } from '../../lib/ecosystem'

type Mode = 'redirect' | 'device' | 'polling' | 'success' | 'error'

interface AuthCallbackProps {
  code?: string
  state?: string
  onSuccess?: () => void
  onError?: (msg: string) => void
}

export default function AuthCallback({ code, state, onSuccess, onError }: AuthCallbackProps) {
  const [mode, setMode] = useState<Mode>(code && state ? 'redirect' : 'device')
  const [deviceCode, setDeviceCode] = useState('')
  const [userCode, setUserCode] = useState('')
  const [verificationUri, setVerificationUri] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (mode === 'redirect' && code && state) {
      handleRedirectCallback()
    }
  }, [mode, code, state])

  useEffect(() => {
    if (mode === 'device' && !deviceCode) {
      initiateDeviceFlow()
    }
  }, [mode, deviceCode])

  useEffect(() => {
    if (mode === 'polling' && deviceCode) {
      pollForCompletion()
    }
  }, [mode, deviceCode])

  async function handleRedirectCallback() {
    try {
      const result = await handleGitHubCallback(code!, state!)
      if (result.success) {
        setMode('success')
        setTimeout(() => onSuccess?.(), 1500)
      } else {
        setErrorMsg(result.error || 'Authentication failed')
        setMode('error')
        onError?.(result.error || 'Authentication failed')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Callback failed')
      setMode('error')
      onError?.(err.message || 'Callback failed')
    }
  }

  async function initiateDeviceFlow() {
    try {
      const flow = await startDeviceFlow()
      setDeviceCode(flow.device_code)
      setUserCode(flow.user_code)
      setVerificationUri(flow.verification_uri)
      setMode('polling')
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start login')
      setMode('error')
      onError?.(err.message || 'Failed to start login')
    }
  }

  async function pollForCompletion() {
    try {
      const result = await pollDeviceCode(deviceCode)
      if (result.access_token) {
        await completeDeviceFlowLogin(result.access_token)
        setMode('success')
        setTimeout(() => onSuccess?.(), 1500)
      } else if (result.error === 'authorization_pending') {
        setTimeout(pollForCompletion, 5000)
      } else if (result.error === 'slow_down') {
        setTimeout(pollForCompletion, 10000)
      } else if (result.error === 'expired_token') {
        setErrorMsg('Code expired. Please try again.')
        setMode('error')
        onError?.('Code expired')
      } else if (result.error === 'access_denied') {
        setErrorMsg('Authorization denied by user.')
        setMode('error')
        onError?.('Access denied')
      } else {
        setTimeout(pollForCompletion, 5000)
      }
    } catch {
      setTimeout(pollForCompletion, 5000)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(userCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function retry() {
    setMode('device')
    setDeviceCode('')
    setUserCode('')
    setErrorMsg('')
  }

  if (mode === 'redirect') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Completing authentication...</p>
        </div>
      </div>
    )
  }

  if (mode === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.checkmark}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#10b981" strokeWidth="3" />
              <path d="M14 24l7 7 13-13" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p style={styles.successText}>Authentication Successful!</p>
          <p style={styles.subText}>Redirecting to Ecosystem...</p>
        </div>
      </div>
    )
  }

  if (mode === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>⚠️</div>
          <p style={styles.errorText}>{errorMsg || 'Something went wrong'}</p>
          <button onClick={retry} style={styles.retryButton}>Try Again</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Connect with GitHub</h2>
        <p style={styles.subtitle}>Follow these steps to sign in</p>

        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepContent}>
              <p style={styles.stepTitle}>Open GitHub</p>
              <a
                href={verificationUri}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.stepLink}
              >
                {verificationUri || 'github.com/login/device'}
              </a>
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepContent}>
              <p style={styles.stepTitle}>Enter this code</p>
              <div style={styles.codeContainer}>
                <span style={styles.codeText}>{userCode || '...'}</span>
                <button onClick={copyCode} style={styles.copyButton}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepContent}>
              <p style={styles.stepTitle}>Authorize ZYRAXON</p>
              <p style={styles.stepDesc}>Click "Authorize" on GitHub to complete sign in</p>
            </div>
          </div>
        </div>

        <div style={styles.pollingIndicator}>
          <div style={styles.spinnerSmall} />
          <span style={styles.pollingText}>Waiting for authorization...</span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0a0a0f',
    padding: 20,
  },
  card: {
    background: '#111118',
    borderRadius: 16,
    padding: 40,
    maxWidth: 420,
    width: '100%',
    border: '1px solid #1a1a2e',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
  },
  subtitle: {
    margin: '0 0 28px',
    fontSize: 14,
    color: '#888',
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    marginBottom: 28,
  },
  step: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4338ca, #6366f1)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    margin: '0 0 4px',
    fontSize: 14,
    fontWeight: 600,
    color: '#e0e0e0',
  },
  stepLink: {
    color: '#818cf8',
    textDecoration: 'none',
    fontSize: 13,
  },
  stepDesc: {
    margin: 0,
    fontSize: 13,
    color: '#888',
  },
  codeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#1a1a2e',
    borderRadius: 8,
    padding: '8px 12px',
    marginTop: 4,
  },
  codeText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#c084fc',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #333',
    background: '#111',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  pollingIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 0 0',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #1a1a2e',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  spinnerSmall: {
    width: 16,
    height: 16,
    border: '2px solid #1a1a2e',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    margin: 0,
    fontSize: 14,
    color: '#888',
  },
  checkmark: {
    margin: '0 auto 16px',
  },
  successText: {
    margin: '0 0 4px',
    fontSize: 18,
    fontWeight: 600,
    color: '#10b981',
  },
  subText: {
    margin: 0,
    fontSize: 14,
    color: '#888',
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  errorText: {
    margin: '0 0 16px',
    fontSize: 14,
    color: '#ef4444',
  },
  retryButton: {
    padding: '8px 24px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #4338ca, #6366f1)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  pollingText: {
    fontSize: 13,
    color: '#888',
  },
}
