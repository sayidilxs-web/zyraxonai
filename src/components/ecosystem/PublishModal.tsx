import { useState, useEffect } from 'react'
import { EcosystemItem, Category, publishItem, getAuthState } from '../../lib/ecosystem'

interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
  onPublished?: (item: EcosystemItem) => void
  aiGenerated?: Partial<EcosystemItem>
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'ai-bots', label: 'AI Bots' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'website-templates', label: 'Templates' },
  { id: 'themes', label: 'Themes' },
  { id: 'components', label: 'Components' },
  { id: 'desktop-apps', label: 'Desktop Apps' },
  { id: 'mobile-apps', label: 'Mobile Apps' },
  { id: 'ai-models', label: 'AI Models' },
  { id: 'tools', label: 'Dev Tools' },
  { id: 'cli-tools', label: 'CLI Tools' },
  { id: 'sdks', label: 'SDKs' },
  { id: 'fonts', label: 'Fonts' },
  { id: 'iso-images', label: 'ISO Images' },
  { id: 'devops', label: 'DevOps' },
  { id: 'pdfs', label: 'PDFs' },
  { id: 'books', label: 'Books' },
  { id: 'prompts', label: 'AI Prompts' },
  { id: 'datasets', label: 'Datasets' },
  { id: 'code-snippets', label: 'Snippets' },
  { id: 'apis', label: 'APIs' },
  { id: 'browser-extensions', label: 'Extensions' },
  { id: 'landing-pages', label: 'Landing Pages' },
  { id: 'ui-kits', label: 'UI Kits' },
  { id: 'icons', label: 'Icons' },
  { id: 'startkits', label: 'Starter Kits' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'types', label: 'Types' },
]

const LICENSES = ['MIT', 'BSL-1.1', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'Unlicense', 'None']

const TYPE_MAP: Record<string, string> = {
  'ai-bots': 'bot', 'plugins': 'plugin', 'website-templates': 'template',
  'themes': 'theme', 'components': 'component', 'desktop-apps': 'desktop-app',
  'mobile-apps': 'app', 'ai-models': 'model', 'tools': 'tool',
  'cli-tools': 'cli', 'sdks': 'sdk', 'fonts': 'font', 'iso-images': 'iso',
  'devops': 'devops', 'pdfs': 'pdf', 'books': 'book', 'prompts': 'prompt',
  'datasets': 'dataset', 'code-snippets': 'snippet', 'apis': 'api',
  'browser-extensions': 'extension', 'landing-pages': 'landing-page',
  'ui-kits': 'ui-kit', 'icons': 'icon', 'startkits': 'startkit',
  'workflows': 'workflow', 'types': 'component',
}

const defaultForm = {
  name: '', description: '', category: 'plugins' as Category, version: '1.0.0',
  tags: '', liveDemo: '', coverImage: '', downloadUrl: '', githubRepo: '',
  installCommand: '', license: 'MIT',
}

type Step = 'form' | 'preview' | 'publishing' | 'done'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#0d1117',
  border: '1px solid #21262d', borderRadius: '8px', color: '#c9d1d9',
  fontSize: '14px', fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s ease',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: '500',
  color: '#c9d1d9', marginBottom: '6px',
}

const rowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen, onClose, onPublished, aiGenerated,
}) => {
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    if (aiGenerated && isOpen) {
      fillFromAI()
    }
  }, [aiGenerated, isOpen])

  const fillFromAI = () => {
    if (!aiGenerated) return
    setForm({
      name: aiGenerated.name || '',
      description: aiGenerated.description || '',
      category: aiGenerated.category || 'plugins',
      version: aiGenerated.version || '1.0.0',
      tags: aiGenerated.tags?.join(', ') || '',
      liveDemo: aiGenerated.liveDemo || '',
      coverImage: aiGenerated.coverImage || '',
      downloadUrl: aiGenerated.downloadUrl || '',
      githubRepo: aiGenerated.githubRepo || '',
      installCommand: aiGenerated.installCommand || '',
      license: aiGenerated.license || 'MIT',
    })
  }

  const resetForm = () => {
    setForm(defaultForm)
    setStep('form')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handlePublish = async () => {
    setStep('publishing')
    try {
      const auth = getAuthState()
      const item: Partial<EcosystemItem> = {
        name: form.name,
        description: form.description,
        category: form.category,
        type: TYPE_MAP[form.category] as any || 'plugin',
        version: form.version,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        liveDemo: form.liveDemo || undefined,
        coverImage: form.coverImage || undefined,
        downloadUrl: form.downloadUrl || undefined,
        githubRepo: form.githubRepo || undefined,
        installCommand: form.installCommand || undefined,
        license: form.license,
        author: auth.user?.displayName || auth.user?.username || 'Anonymous',
        authorId: auth.user?.id || '',
        authorAvatar: auth.user?.avatarUrl || '',
      }
      const published = await publishItem(item as EcosystemItem)
      setStep('done')
      onPublished?.(published)
    } catch {
      setStep('form')
    }
  }

  if (!isOpen) return null

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#161b22', border: '1px solid #21262d',
          borderRadius: '16px', width: '100%', maxWidth: '640px',
          maxHeight: '90vh', overflow: 'hidden', display: 'flex',
          flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #21262d',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>📦</span>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f0f6fc', margin: 0 }}>
              {step === 'form' && 'Publish to Marketplace'}
              {step === 'preview' && 'Preview'}
              {step === 'publishing' && 'Publishing...'}
              {step === 'done' && 'Published!'}
            </h2>
          </div>
          {step !== 'publishing' && (
            <button
              onClick={handleClose}
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'transparent', border: '1px solid #21262d',
                color: '#8b949e', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                fontFamily: 'inherit', outline: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#484f58'; e.currentTarget.style.color = '#c9d1d9' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.color = '#8b949e' }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: '20px' }}>
          {step === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="My Awesome Plugin"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#21262d' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="What does it do? Why should someone use it?"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#21262d' }}
                />
              </div>

              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Version</label>
                  <input
                    value={form.version}
                    onChange={(e) => updateField('version', e.target.value)}
                    placeholder="1.0.0"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#21262d' }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tags (comma separated)</label>
                <input
                  value={form.tags}
                  onChange={(e) => updateField('tags', e.target.value)}
                  placeholder="react, typescript, ui"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#21262d' }}
                />
              </div>

              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>Live Demo URL</label>
                  <input
                    value={form.liveDemo}
                    onChange={(e) => updateField('liveDemo', e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#21262d' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Cover Image URL</label>
                  <input
                    value={form.coverImage}
                    onChange={(e) => updateField('coverImage', e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#21262d' }}
                  />
                </div>
              </div>

              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>Download URL</label>
                  <input
                    value={form.downloadUrl}
                    onChange={(e) => updateField('downloadUrl', e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#21262d' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>GitHub Repo</label>
                  <input
                    value={form.githubRepo}
                    onChange={(e) => updateField('githubRepo', e.target.value)}
                    placeholder="https://github.com/..."
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#21262d' }}
                  />
                </div>
              </div>

              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>Install Command</label>
                  <input
                    value={form.installCommand}
                    onChange={(e) => updateField('installCommand', e.target.value)}
                    placeholder="npm install ..."
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#21262d' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>License</label>
                  <select
                    value={form.license}
                    onChange={(e) => updateField('license', e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {LICENSES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={handleClose}
                  style={{
                    padding: '10px 20px', borderRadius: '8px',
                    background: 'transparent', border: '1px solid #30363d',
                    color: '#8b949e', cursor: 'pointer', fontSize: '14px',
                    fontWeight: '500', fontFamily: 'inherit', outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#484f58'; e.currentTarget.style.color = '#c9d1d9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('preview')}
                  disabled={!form.name.trim() || !form.description.trim()}
                  style={{
                    padding: '10px 20px', borderRadius: '8px',
                    background: form.name.trim() && form.description.trim() ? '#238636' : '#21262d',
                    border: '1px solid',
                    borderColor: form.name.trim() && form.description.trim() ? '#2ea043' : '#30363d',
                    color: form.name.trim() && form.description.trim() ? '#ffffff' : '#484f58',
                    cursor: form.name.trim() && form.description.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Preview →
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div style={{
                background: '#0d1117', border: '1px solid #21262d',
                borderRadius: '12px', padding: '20px', marginBottom: '20px',
              }}>
                {form.coverImage && (
                  <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', border: '1px solid #21262d' }}>
                    <img src={form.coverImage} alt={form.name} style={{ width: '100%', display: 'block' }} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f0f6fc', margin: 0 }}>
                    {form.name}
                  </h3>
                  <span style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                    fontWeight: '600', textTransform: 'capitalize',
                    background: 'rgba(88, 166, 255, 0.1)', color: '#58a6ff',
                  }}>
                    {TYPE_MAP[form.category] || form.category}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: '#8b949e', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                  {form.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {form.tags.split(',').filter(Boolean).map((t) => (
                    <span key={t} style={{
                      padding: '3px 10px', background: '#21262d', borderRadius: '12px',
                      fontSize: '12px', color: '#8b949e',
                    }}>
                      {t.trim()}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#484f58' }}>
                  <span>v{form.version}</span>
                  <span>{form.license}</span>
                  {form.liveDemo && <span>🔗 {form.liveDemo}</span>}
                  {form.githubRepo && <span>📂 GitHub</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setStep('form')}
                  style={{
                    padding: '10px 20px', borderRadius: '8px',
                    background: 'transparent', border: '1px solid #30363d',
                    color: '#8b949e', cursor: 'pointer', fontSize: '14px',
                    fontWeight: '500', fontFamily: 'inherit', outline: 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#484f58'; e.currentTarget.style.color = '#c9d1d9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e' }}
                >
                  ← Back
                </button>
                <button
                  onClick={handlePublish}
                  style={{
                    padding: '10px 24px', borderRadius: '8px',
                    background: '#238636', border: '1px solid #2ea043',
                    color: '#ffffff', cursor: 'pointer', fontSize: '14px',
                    fontWeight: '600', fontFamily: 'inherit', outline: 'none',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#2ea043' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#238636' }}
                >
                  🚀 Publish
                </button>
              </div>
            </div>
          )}

          {step === 'publishing' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '48px', height: '48px', border: '3px solid #21262d',
                borderTopColor: '#58a6ff', borderRadius: '50%',
                animation: 'spin 1s linear infinite', margin: '0 auto 16px',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              <p style={{ fontSize: '16px', color: '#8b949e' }}>
                Publishing {form.name}...
              </p>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(63, 185, 80, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '32px',
              }}>
                ✓
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#f0f6fc', marginBottom: '8px' }}>
                {form.name} published!
              </h3>
              <p style={{ fontSize: '14px', color: '#8b949e', marginBottom: '24px' }}>
                Your item is now live on the ZYRAXON Marketplace
              </p>
              <button
                onClick={handleClose}
                style={{
                  padding: '10px 24px', borderRadius: '8px',
                  background: '#238636', border: '1px solid #2ea043',
                  color: '#ffffff', cursor: 'pointer', fontSize: '14px',
                  fontWeight: '600', fontFamily: 'inherit', outline: 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#2ea043' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#238636' }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
