import { useState, useRef, useEffect } from 'react'
import { EcosystemItem, Category } from '../../lib/ecosystem-types'
import { getAuthState } from '../../lib/ecosystem-auth'
import { publishItem, formatFileSize } from '../../lib/ecosystem-extras'

interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
  onPublished?: (item: EcosystemItem) => void
  aiGenerated?: Partial<EcosystemItem>
}

const CATEGORIES: { id: Category; label: string; accept: string }[] = [
  { id: 'ai-bots', label: 'AI Bots', accept: '.py,.js,.ts,.json,.yaml,.yml,.zip' },
  { id: 'plugins', label: 'Plugins', accept: '.js,.ts,.jsx,.tsx,.json,.zip' },
  { id: 'website-templates', label: 'Templates', accept: '.html,.css,.js,.ts,.jsx,.tsx,.zip' },
  { id: 'themes', label: 'Themes', accept: '.css,.scss,.less,.json,.zip' },
  { id: 'components', label: 'Components', accept: '.jsx,.tsx,.vue,.svelte,.zip' },
  { id: 'desktop-apps', label: 'Desktop Apps', accept: '.exe,.dmg,.AppImage,.deb,.zip,.msi' },
  { id: 'mobile-apps', label: 'Mobile Apps', accept: '.apk,.ipa,.aab,.zip' },
  { id: 'ai-models', label: 'AI Models', accept: '.bin,.gguf,.onnx,.pt,.pth,.zip' },
  { id: 'tools', label: 'Dev Tools', accept: '.exe,.dmg,.AppImage,.deb,.zip,.js,.ts' },
  { id: 'cli-tools', label: 'CLI Tools', accept: '.js,.ts,.py,.go,.rs,.zip' },
  { id: 'sdks', label: 'SDKs', accept: '.js,.ts,.py,.go,.rs,.zip' },
  { id: 'fonts', label: 'Fonts', accept: '.ttf,.otf,.woff,.woff2,.zip' },
  { id: 'iso-images', label: 'ISO Images', accept: '.iso,.img,.zip' },
  { id: 'devops', label: 'DevOps', accept: '.yml,.yaml,.tf,.hcl,.dockerfile,.zip' },
  { id: 'pdfs', label: 'PDFs', accept: '.pdf' },
  { id: 'books', label: 'Books', accept: '.pdf,.epub,.mobi,.zip' },
  { id: 'prompts', label: 'AI Prompts', accept: '.txt,.md,.json,.yaml,.zip' },
  { id: 'datasets', label: 'Datasets', accept: '.csv,.json,.jsonl,.parquet,.zip' },
  { id: 'code-snippets', label: 'Snippets', accept: '.js,.ts,.py,.go,.rs,.java,.zip' },
  { id: 'apis', label: 'APIs', accept: '.json,.yaml,.yml,.openapi,.zip' },
  { id: 'browser-extensions', label: 'Extensions', accept: '.crx,.xpi,.zip' },
  { id: 'landing-pages', label: 'Landing Pages', accept: '.html,.css,.js,.zip' },
  { id: 'ui-kits', label: 'UI Kits', accept: '.fig,.sketch,.xd,.zip' },
  { id: 'icons', label: 'Icons', accept: '.svg,.png,.zip' },
  { id: 'startkits', label: 'Starter Kits', accept: '.zip,.tar.gz' },
  { id: 'workflows', label: 'Workflows', accept: '.json,.yaml,.yml,.zip' },
  { id: 'types', label: 'Types', accept: '.d.ts,.ts,.json,.zip' },
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
  tags: '', liveDemo: '', githubRepo: '', installCommand: '', license: 'MIT',
  platforms: [] as string[],
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

const dropZoneBase: React.CSSProperties = {
  border: '2px dashed #30363d', borderRadius: '8px', padding: '16px',
  textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
  background: '#0d1117',
}

function FileDropZone({
  label, accept, file, onFile, icon, multiple, maxSize,
}: {
  label: string; accept: string; file: File | null; onFile: (f: File | null) => void;
  icon: string; multiple?: boolean; maxSize?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      if (multiple) {
        const limited = files.slice(0, 5)
        for (const f of limited) {
          if (maxSize && f.size > maxSize) continue
          onFile(f)
        }
      } else {
        onFile(files[0])
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    if (multiple) {
      Array.from(files).slice(0, 5).forEach(f => onFile(f))
    } else {
      onFile(files[0])
    }
  }

  const previewUrl = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        ...dropZoneBase,
        borderColor: dragOver ? '#58a6ff' : file ? '#238636' : '#30363d',
        background: dragOver ? 'rgba(88,166,255,0.05)' : file ? 'rgba(63,185,80,0.05)' : '#0d1117',
      }}
    >
      <input
        ref={inputRef} type="file" accept={accept} multiple={multiple}
        onChange={handleChange} style={{ display: 'none' }}
      />
      {previewUrl ? (
        <div>
          <img src={previewUrl} alt="" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '6px', marginBottom: '8px' }} />
          <div style={{ fontSize: '13px', color: '#8b949e' }}>{file!.name} ({formatFileSize(file!.size)})</div>
          <button
            onClick={(e) => { e.stopPropagation(); onFile(null); URL.revokeObjectURL(previewUrl) }}
            style={{ marginTop: '6px', padding: '4px 12px', borderRadius: '6px', background: '#da3633', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px' }}
          >
            Remove
          </button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
          <div style={{ fontSize: '13px', color: '#8b949e' }}>{label}</div>
          {file && <div style={{ fontSize: '12px', color: '#3fb950', marginTop: '4px' }}>✓ {file.name}</div>}
        </div>
      )}
    </div>
  )
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen, onClose, onPublished, aiGenerated,
}) => {
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState(defaultForm)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [logo, setLogo] = useState<File | null>(null)
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [downloadFile, setDownloadFile] = useState<File | null>(null)

  const selectedCategory = CATEGORIES.find(c => c.id === form.category)

  useEffect(() => {
    if (aiGenerated && isOpen) fillFromAI()
  }, [aiGenerated, isOpen])

  const fillFromAI = () => {
    if (!aiGenerated) return
    setForm({
      name: aiGenerated.name || '', description: aiGenerated.description || '',
      category: aiGenerated.category || 'plugins', version: aiGenerated.version || '1.0.0',
      tags: aiGenerated.tags?.join(', ') || '', liveDemo: aiGenerated.liveDemo || '',
      githubRepo: aiGenerated.githubRepo || '', installCommand: aiGenerated.installCommand || '',
      license: aiGenerated.license || 'MIT', platforms: [],
    })
  }

  const resetForm = () => {
    setForm(defaultForm)
    setCoverImage(null)
    setLogo(null)
    setScreenshots([])
    setDownloadFile(null)
    setStep('form')
  }

  const handleClose = () => { resetForm(); onClose() }
  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const addScreenshot = (file: File) => {
    if (screenshots.length < 5) setScreenshots(prev => [...prev, file])
  }

  const removeScreenshot = (idx: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== idx))
  }

  const handlePublish = async () => {
    setStep('publishing')
    try {
      const auth = getAuthState()
      const item: Partial<EcosystemItem> = {
        name: form.name, description: form.description, category: form.category,
        type: TYPE_MAP[form.category] as any || 'plugin', version: form.version,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        liveDemo: form.liveDemo || undefined, githubRepo: form.githubRepo || undefined,
        installCommand: form.installCommand || undefined, license: form.license,
        platforms: form.platforms.length > 0 ? form.platforms : undefined,
        author: auth.user?.displayName || auth.user?.username || 'Anonymous',
        authorId: auth.user?.id || '', authorAvatar: auth.user?.avatarUrl || '',
      }
      const files: { coverImage?: File; logo?: File; screenshots?: File[]; downloadFile?: File } = {}
      if (coverImage) files.coverImage = coverImage
      if (logo) files.logo = logo
      if (screenshots.length > 0) files.screenshots = screenshots
      if (downloadFile) files.downloadFile = downloadFile

      const published = await publishItem(item as EcosystemItem, Object.keys(files).length > 0 ? files : undefined)
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
        background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#161b22', border: '1px solid #21262d', borderRadius: '16px',
          width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
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
            <button onClick={handleClose} style={{
              width: '32px', height: '32px', borderRadius: '8px', background: 'transparent',
              border: '1px solid #21262d', color: '#8b949e', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              fontFamily: 'inherit', outline: 'none', transition: 'all 0.15s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#484f58'; e.currentTarget.style.color = '#c9d1d9' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.color = '#8b949e' }}
            >✕</button>
          )}
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: '20px' }}>
          {step === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input value={form.name} onChange={e => updateField('name', e.target.value)}
                  placeholder="My Awesome Plugin" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#58a6ff' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#21262d' }} />
              </div>
              <div>
                <label style={labelStyle}>Description *</label>
                <textarea value={form.description} onChange={e => updateField('description', e.target.value)}
                  placeholder="What does it do? Why should someone use it?" rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#58a6ff' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#21262d' }} />
              </div>
              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>Category *</label>
                  <select value={form.category} onChange={e => updateField('category', e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Version</label>
                  <input value={form.version} onChange={e => updateField('version', e.target.value)}
                    placeholder="1.0.0" style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#58a6ff' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#21262d' }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tags (comma separated)</label>
                <input value={form.tags} onChange={e => updateField('tags', e.target.value)}
                  placeholder="react, typescript, ui" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#58a6ff' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#21262d' }} />
              </div>
              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>Live Demo URL</label>
                  <input value={form.liveDemo} onChange={e => updateField('liveDemo', e.target.value)}
                    placeholder="https://..." style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#58a6ff' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#21262d' }} />
                </div>
                <div>
                  <label style={labelStyle}>GitHub Repo</label>
                  <input value={form.githubRepo} onChange={e => updateField('githubRepo', e.target.value)}
                    placeholder="https://github.com/..." style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#58a6ff' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#21262d' }} />
                </div>
              </div>
              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>Install Command</label>
                  <input value={form.installCommand} onChange={e => updateField('installCommand', e.target.value)}
                    placeholder="npm install ..." style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#58a6ff' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#21262d' }} />
                </div>
                <div>
                  <label style={labelStyle}>License</label>
                  <select value={form.license} onChange={e => updateField('license', e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {LICENSES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #21262d', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f0f6fc', margin: '0 0 12px 0' }}>
                  Files & Assets
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FileDropZone label="Cover Image" accept="image/*" file={coverImage}
                    onFile={f => setCoverImage(f)} icon="🖼️" maxSize={10 * 1024 * 1024} />
                  <FileDropZone label="Logo" accept="image/*" file={logo}
                    onFile={f => setLogo(f)} icon="🏷️" maxSize={5 * 1024 * 1024} />
                </div>
                <div style={{ marginTop: '12px' }}>
                  <FileDropZone
                    label={`Download File (${selectedCategory?.label || 'any'})`}
                    accept={selectedCategory?.accept || '*/*'}
                    file={downloadFile} onFile={f => setDownloadFile(f)} icon="📦"
                    maxSize={100 * 1024 * 1024}
                  />
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label style={labelStyle}>Screenshots (max 5)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                    {screenshots.map((ss, idx) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #21262d' }}>
                        <img src={URL.createObjectURL(ss)} alt="" style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                        <button onClick={() => removeScreenshot(idx)}
                          style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', background: '#da3633', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          ×
                        </button>
                        <div style={{ fontSize: '10px', color: '#8b949e', padding: '2px 4px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ss.name}
                        </div>
                      </div>
                    ))}
                    {screenshots.length < 5 && (
                      <FileDropZone label="Add Screenshot" accept="image/*" file={null}
                        onFile={f => { if (f) addScreenshot(f) }} icon="📸" />
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={handleClose} style={{
                  padding: '10px 20px', borderRadius: '8px', background: 'transparent',
                  border: '1px solid #30363d', color: '#8b949e', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '500', fontFamily: 'inherit', outline: 'none',
                  transition: 'all 0.15s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#484f58'; e.currentTarget.style.color = '#c9d1d9' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e' }}
                >Cancel</button>
                <button onClick={() => setStep('preview')}
                  disabled={!form.name.trim() || !form.description.trim()} style={{
                    padding: '10px 20px', borderRadius: '8px',
                    background: form.name.trim() && form.description.trim() ? '#238636' : '#21262d',
                    border: '1px solid', borderColor: form.name.trim() && form.description.trim() ? '#2ea043' : '#30363d',
                    color: form.name.trim() && form.description.trim() ? '#ffffff' : '#484f58',
                    cursor: form.name.trim() && form.description.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', outline: 'none',
                    transition: 'all 0.15s ease',
                  }}>Preview →</button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div style={{
                background: '#0d1117', border: '1px solid #21262d',
                borderRadius: '12px', padding: '20px', marginBottom: '20px',
              }}>
                {coverImage && (
                  <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', border: '1px solid #21262d' }}>
                    <img src={URL.createObjectURL(coverImage)} alt={form.name} style={{ width: '100%', display: 'block' }} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  {logo && <img src={URL.createObjectURL(logo)} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />}
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f0f6fc', margin: 0 }}>{form.name}</h3>
                  <span style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                    fontWeight: '600', textTransform: 'capitalize',
                    background: 'rgba(88, 166, 255, 0.1)', color: '#58a6ff',
                  }}>{TYPE_MAP[form.category] || form.category}</span>
                </div>
                <p style={{ fontSize: '14px', color: '#8b949e', lineHeight: '1.6', margin: '0 0 12px 0' }}>{form.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {form.tags.split(',').filter(Boolean).map(t => (
                    <span key={t} style={{ padding: '3px 10px', background: '#21262d', borderRadius: '12px', fontSize: '12px', color: '#8b949e' }}>{t.trim()}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#484f58' }}>
                  <span>v{form.version}</span><span>{form.license}</span>
                  {form.liveDemo && <span>🔗 {form.liveDemo}</span>}
                  {form.githubRepo && <span>📂 GitHub</span>}
                  {downloadFile && <span>📦 {formatFileSize(downloadFile.size)}</span>}
                </div>
                {screenshots.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto' }}>
                    {screenshots.map((ss, i) => (
                      <img key={i} src={URL.createObjectURL(ss)} alt="" style={{ height: '80px', borderRadius: '6px', border: '1px solid #21262d' }} />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep('form')} style={{
                  padding: '10px 20px', borderRadius: '8px', background: 'transparent',
                  border: '1px solid #30363d', color: '#8b949e', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '500', fontFamily: 'inherit', outline: 'none',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#484f58'; e.currentTarget.style.color = '#c9d1d9' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e' }}
                >← Back</button>
                <button onClick={handlePublish} style={{
                  padding: '10px 24px', borderRadius: '8px', background: '#238636',
                  border: '1px solid #2ea043', color: '#ffffff', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', outline: 'none',
                  transition: 'background 0.15s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#2ea043' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#238636' }}
                >🚀 Publish</button>
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
              <p style={{ fontSize: '16px', color: '#8b949e' }}>Publishing {form.name}...</p>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(63, 185, 80, 0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px',
              }}>✓</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#f0f6fc', marginBottom: '8px' }}>{form.name} published!</h3>
              <p style={{ fontSize: '14px', color: '#8b949e', marginBottom: '24px' }}>Your item is now live on the ZYRAXON Marketplace</p>
              <button onClick={handleClose} style={{
                padding: '10px 24px', borderRadius: '8px', background: '#238636',
                border: '1px solid #2ea043', color: '#ffffff', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', outline: 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#2ea043' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#238636' }}
              >Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
