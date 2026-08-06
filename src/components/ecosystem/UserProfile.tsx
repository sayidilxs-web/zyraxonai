import { useState, useEffect } from 'react'
import { User, EcosystemItem, getItemsByAuthor, getGitHubStorage, getAuthState } from '../../lib/ecosystem'
import { IconUser, IconSettings, IconMapPin, IconGlobe, IconCalendar, IconHeart, IconStar, IconPackage, IconEdit, IconCheck, IconX, IconLoader } from './Icons'
import { ItemCard } from './ItemCard'

interface UserProfileProps {
  user: User
  isOwnProfile?: boolean
}

type ProfileTab = 'items' | 'likes' | 'about'

export const UserProfile: React.FC<UserProfileProps> = ({ user, isOwnProfile = false }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('items')
  const [items, setItems] = useState<EcosystemItem[]>([])
  const [likedItems, setLikedItems] = useState<string[]>([])
  const [allItems, setAllItems] = useState<EcosystemItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    displayName: user.displayName,
    title: user.title,
    bio: user.bio,
    location: user.location,
    company: user.company,
    blog: user.blog,
    skills: [...user.skills],
  })
  const [newSkill, setNewSkill] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [userItems, authState] = await Promise.all([
          getItemsByAuthor(user.id),
          Promise.resolve(getAuthState()),
        ])
        setItems(userItems)

        if (authState.isAuthenticated && authState.user) {
          const storage = getGitHubStorage()
          if (storage) {
            const [userLikes, followData] = await Promise.all([
              storage.get(`likes/${authState.user.id}`).catch(() => null),
              storage.get(`followers/${user.id}`).catch(() => null),
            ])
            if (Array.isArray(userLikes)) setLikedItems(userLikes)
            if (Array.isArray(followData)) {
              setIsFollowing(followData.includes(authState.user.id))
            }
          }
        }

        const all = await import('../../lib/ecosystem').then((m) => m.getAllItems())
        setAllItems(all)
      } catch {}
      setLoading(false)
    }
    load()
  }, [user.id])

  const handleFollow = async () => {
    const auth = getAuthState()
    if (!auth.isAuthenticated || !auth.user) return
    const storage = getGitHubStorage()
    if (!storage) return

    try {
      const followers = (await storage.get(`followers/${user.id}`)) || []
      const following = (await storage.get(`following/${auth.user.id}`)) || []

      if (isFollowing) {
        const newFollowers = followers.filter((id: string) => id !== auth.user!.id)
        const newFollowing = following.filter((id: string) => id !== user.id)
        await storage.set(`followers/${user.id}`, newFollowers)
        await storage.set(`following/${auth.user.id}`, newFollowing)
        setIsFollowing(false)
      } else {
        followers.push(auth.user.id)
        following.push(user.id)
        await storage.set(`followers/${user.id}`, followers)
        await storage.set(`following/${auth.user.id}`, following)
        setIsFollowing(true)
      }
    } catch {}
  }

  const handleSaveProfile = async () => {
    const auth = getAuthState()
    if (!auth.isAuthenticated || !auth.user) return
    const storage = getGitHubStorage()
    if (!storage) return

    setSaving(true)
    try {
      const updatedUser = {
        ...user,
        displayName: editData.displayName,
        title: editData.title,
        bio: editData.bio,
        location: editData.location,
        company: editData.company,
        blog: editData.blog,
        skills: editData.skills,
      }
      await storage.set(`user/${user.id}`, updatedUser)
      setEditMode(false)
    } catch {}
    setSaving(false)
  }

  const addSkill = () => {
    const skill = newSkill.trim()
    if (skill && !editData.skills.includes(skill)) {
      setEditData((prev) => ({ ...prev, skills: [...prev.skills, skill] }))
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setEditData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }))
  }

  const likedItemObjects = allItems.filter((item) => likedItems.includes(item.id))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const bannerStyle: React.CSSProperties = {
    height: '200px',
    background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #1a1e2e 100%)',
    borderRadius: '12px 12px 0 0',
    position: 'relative',
    overflow: 'hidden',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#c9d1d9',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
    lineHeight: '1.5',
  }

  return (
    <div style={{
      background: 'rgba(28,34,46,0.55)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
      maxWidth: '960px',
      margin: '0 auto',
    }}>
      <div style={bannerStyle}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 30% 50%, rgba(88, 166, 255, 0.08) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 70% 30%, rgba(139, 92, 246, 0.06) 0%, transparent 50%)',
        }} />
      </div>

      <div style={{ padding: '0 32px 32px', position: 'relative' }}>
        <div style={{
          marginTop: '-48px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '20px',
        }}>
          <div style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            border: '4px solid #161b22',
            overflow: 'hidden',
            background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
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
                <IconUser size={40} />
              </div>
            )}
          </div>

          <div style={{ flex: 1, paddingBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {editMode ? (
                <input
                  value={editData.displayName}
                  onChange={(e) => setEditData((prev) => ({ ...prev, displayName: e.target.value }))}
                  style={{ ...inputStyle, fontSize: '22px', fontWeight: '600', width: 'auto', flex: 1, maxWidth: '300px' }}
                  placeholder="Display name"
                />
              ) : (
                <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#c9d1d9', margin: 0 }}>
                  {user.displayName || user.username}
                </h1>
              )}
              <span style={{ fontSize: '14px', color: '#8b949e' }}>@{user.username}</span>
            </div>
            {editMode ? (
              <input
                value={editData.title}
                onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
                style={{ ...inputStyle, marginTop: '8px', maxWidth: '400px' }}
                placeholder="Title (e.g. Full Stack Developer)"
              />
            ) : user.title ? (
              <div style={{ fontSize: '14px', color: '#8b949e', marginTop: '4px' }}>{user.title}</div>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px' }}>
            {isOwnProfile ? (
              editMode ? (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: '#238636',
                      border: '1px solid #2ea043',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  >
                    {saving ? <IconLoader size={14} /> : <IconCheck size={14} />}
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#c9d1d9',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  >
                    <IconX size={14} />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#c9d1d9',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff50'; e.currentTarget.style.color = '#58a6ff' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#c9d1d9' }}
                >
                  <IconEdit size={14} />
                  Edit Profile
                </button>
              )
            ) : (
              <button
                onClick={handleFollow}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  background: isFollowing ? 'transparent' : '#238636',
                  border: '1px solid',
                  borderColor: isFollowing ? '#30363d' : '#2ea043',
                  borderRadius: '8px',
                  color: isFollowing ? '#c9d1d9' : '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          padding: '16px 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '24px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#c9d1d9' }}>{user.publishedCount}</div>
            <div style={{ fontSize: '12px', color: '#8b949e' }}>Published</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#c9d1d9' }}>{user.followerCount}</div>
            <div style={{ fontSize: '12px', color: '#8b949e' }}>Followers</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#c9d1d9' }}>{user.followingCount}</div>
            <div style={{ fontSize: '12px', color: '#8b949e' }}>Following</div>
          </div>
        </div>

        {editMode && (
          <div style={{
            padding: '20px',
            background: 'rgba(13,17,23,0.55)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            marginBottom: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 16px' }}>Edit Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px', display: 'block' }}>Display Name</label>
                <input value={editData.displayName} onChange={(e) => setEditData((p) => ({ ...p, displayName: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px', display: 'block' }}>Title</label>
                <input value={editData.title} onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px', display: 'block' }}>Bio</label>
                <textarea value={editData.bio} onChange={(e) => setEditData((p) => ({ ...p, bio: e.target.value }))} style={textareaStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px', display: 'block' }}>Location</label>
                <input value={editData.location} onChange={(e) => setEditData((p) => ({ ...p, location: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px', display: 'block' }}>Company</label>
                <input value={editData.company} onChange={(e) => setEditData((p) => ({ ...p, company: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px', display: 'block' }}>Blog</label>
                <input value={editData.blog} onChange={(e) => setEditData((p) => ({ ...p, blog: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px', display: 'block' }}>Skills</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {editData.skills.map((skill) => (
                    <span key={skill} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      background: 'rgba(88, 166, 255, 0.1)',
                      border: '1px solid rgba(88, 166, 255, 0.2)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      color: '#58a6ff',
                    }}>
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#58a6ff',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          outline: 'none',
                          opacity: 0.7,
                        }}
                      >
                        <IconX size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                    placeholder="Add a skill"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={addSkill}
                    disabled={!newSkill.trim()}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(48,54,61,0.45)', backdropFilter: 'blur(14px)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#c9d1d9',
                      fontSize: '13px',
                      cursor: newSkill.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                      outline: 'none',
                      opacity: newSkill.trim() ? 1 : 0.5,
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '24px',
        }}>
          {(['items', 'likes', 'about'] as ProfileTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: '2px solid',
                borderBottomColor: activeTab === tab ? '#58a6ff' : 'transparent',
                color: activeTab === tab ? '#c9d1d9' : '#8b949e',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.15s ease',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'items' && <IconPackage size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
              {tab === 'likes' && <IconHeart size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
              {tab === 'about' && <IconCalendar size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
              {tab}
              {tab === 'items' && <span style={{ marginLeft: '6px', fontSize: '12px', color: '#484f58' }}>{items.length}</span>}
              {tab === 'likes' && <span style={{ marginLeft: '6px', fontSize: '12px', color: '#484f58' }}>{likedItems.length}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px',
            color: '#8b949e',
          }}>
            <IconLoader size={24} />
          </div>
        ) : (
          <>
            {activeTab === 'items' && (
              <div>
                {items.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    color: '#484f58',
                    fontSize: '14px',
                  }}>
                    {isOwnProfile ? "You haven't published anything yet." : "This user hasn't published anything yet."}
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '16px',
                  }}>
                    {items.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'likes' && (
              <div>
                {likedItemObjects.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    color: '#484f58',
                    fontSize: '14px',
                  }}>
                    {isOwnProfile ? "You haven't liked anything yet." : "This user hasn't liked anything yet."}
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '16px',
                  }}>
                    {likedItemObjects.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
              }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 16px' }}>Profile</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {user.bio && (
                      <div style={{ fontSize: '14px', color: '#c9d1d9', lineHeight: '1.6' }}>
                        {user.bio}
                      </div>
                    )}
                    {user.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#8b949e' }}>
                        <IconMapPin size={14} />
                        {user.location}
                      </div>
                    )}
                    {user.company && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#8b949e' }}>
                        <IconUser size={14} />
                        {user.company}
                      </div>
                    )}
                    {user.blog && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#8b949e' }}>
                        <IconGlobe size={14} />
                        <a href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`} target="_blank" rel="noopener noreferrer" style={{ color: '#58a6ff', textDecoration: 'none' }}>
                          {user.blog}
                        </a>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#8b949e' }}>
                      <IconCalendar size={14} />
                      Joined {formatDate(user.createdAt)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9', margin: '0 0 16px' }}>Skills</h3>
                  {user.skills.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#484f58' }}>No skills listed</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {user.skills.map((skill) => (
                        <span key={skill} style={{
                          padding: '4px 12px',
                          background: 'rgba(88, 166, 255, 0.1)',
                          border: '1px solid rgba(88, 166, 255, 0.2)',
                          borderRadius: '20px',
                          fontSize: '12px',
                          color: '#58a6ff',
                        }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
