const GITHUB_API = "https://api.github.com"

class GitHubDataStorage {
  private token: string
  private username: string
  private repoName = "zyraxon-ecosystem-data"

  constructor(token: string, username: string) {
    this.token = token
    this.username = username
  }

  private get headers() {
    return {
      Authorization: `token ${this.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    }
  }

  async initUserData(): Promise<void> {
    const exists = await this.checkRepoExists()
    if (!exists) {
      await this.createDataRepo()
    }

    const files = [
      { path: "profile.json", content: JSON.stringify({ username: this.username, bio: "", avatar: "", skills: [], interests: [], joinedAt: new Date().toISOString() }) },
      { path: "likes.json", content: JSON.stringify([]) },
      { path: "comments.json", content: JSON.stringify([]) },
      { path: "follows.json", content: JSON.stringify({ followers: [], following: [] }) },
      { path: "published.json", content: JSON.stringify([]) },
      { path: "ai-connection.json", content: JSON.stringify({ connected: false, sessions: [] }) },
      { path: "community_chat.json", content: JSON.stringify([]) },
      { path: "marketplace.json", content: JSON.stringify([]) },
    ]

    for (const file of files) {
      await this.ensureFileExists(file.path, file.content)
    }
  }

  private async checkRepoExists(): Promise<boolean> {
    try {
      const res = await fetch(`${GITHUB_API}/repos/${this.username}/${this.repoName}`, {
        headers: this.headers,
      })
      return res.status === 200
    } catch {
      return false
    }
  }

  private async createDataRepo(): Promise<void> {
    await fetch(`${GITHUB_API}/user/repos`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        name: this.repoName,
        description: "Zyraxon Ecosystem — personal user data storage",
        private: true,
        auto_init: true,
      }),
    })
  }

  private async ensureFileExists(path: string, defaultContent: string): Promise<void> {
    try {
      const res = await fetch(`${GITHUB_API}/repos/${this.username}/${this.repoName}/contents/${path}`, {
        headers: this.headers,
      })
      if (res.status === 404) {
        await this.createFile(path, defaultContent)
      }
    } catch {
      await this.createFile(path, defaultContent)
    }
  }

  private async createFile(path: string, content: string): Promise<void> {
    const encoded = btoa(unescape(encodeURIComponent(content)))
    await fetch(`${GITHUB_API}/repos/${this.username}/${this.repoName}/contents/${path}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify({
        message: `Initialize ${path}`,
        content: encoded,
      }),
    })
  }

  private async getFile(path: string): Promise<any> {
    const res = await fetch(`${GITHUB_API}/repos/${this.username}/${this.repoName}/contents/${path}`, {
      headers: this.headers,
    })
    if (!res.ok) return null
    const data = await res.json()
    const raw = decodeURIComponent(escape(atob(data.content)))
    return JSON.parse(raw)
  }

  async updateFile(path: string, content: any, message: string): Promise<void> {
    const res = await fetch(`${GITHUB_API}/repos/${this.username}/${this.repoName}/contents/${path}`, {
      headers: this.headers,
    })
    const fileData = await res.json()
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))))
    await fetch(`${GITHUB_API}/repos/${this.username}/${this.repoName}/contents/${path}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify({
        message,
        content: encoded,
        sha: fileData.sha,
      }),
    })
  }

  async getProfile(): Promise<any> {
    return (await this.getFile("profile.json")) || { username: this.username, bio: "", avatar: "", skills: [], interests: [] }
  }

  async updateProfile(profile: any): Promise<void> {
    await this.updateFile("profile.json", profile, "Update profile")
  }

  async getLikes(): Promise<string[]> {
    return (await this.getFile("likes.json")) || []
  }

  async addLike(itemId: string): Promise<void> {
    const likes = await this.getLikes()
    if (!likes.includes(itemId)) {
      likes.push(itemId)
      await this.updateFile("likes.json", likes, `Like ${itemId}`)
    }
  }

  async removeLike(itemId: string): Promise<void> {
    const likes = await this.getLikes()
    const filtered = likes.filter((id: string) => id !== itemId)
    await this.updateFile("likes.json", filtered, `Unlike ${itemId}`)
  }

  async isLiked(itemId: string): Promise<boolean> {
    const likes = await this.getLikes()
    return likes.includes(itemId)
  }

  async getComments(): Promise<any[]> {
    return (await this.getFile("comments.json")) || []
  }

  async addComment(itemIdOrComment: string | any, possibleComment?: any): Promise<void> {
    const comments = await this.getComments()
    const comment = possibleComment ? { ...possibleComment, itemId: itemIdOrComment } : itemIdOrComment
    comments.push({ ...comment, id: crypto.randomUUID(), userId: this.username, createdAt: new Date().toISOString() })
    await this.updateFile("comments.json", comments, "Add comment")
  }

  async getFollows(): Promise<{ followers: string[]; following: string[] }> {
    return (await this.getFile("follows.json")) || { followers: [], following: [] }
  }

  async followUser(userId: string): Promise<void> {
    const follows = await this.getFollows()
    if (!follows.following.includes(userId)) {
      follows.following.push(userId)
      await this.updateFile("follows.json", follows, `Follow ${userId}`)
    }
  }

  async unfollowUser(userId: string): Promise<void> {
    const follows = await this.getFollows()
    follows.following = follows.following.filter((id: string) => id !== userId)
    await this.updateFile("follows.json", follows, `Unfollow ${userId}`)
  }

  async isFollowing(userId: string): Promise<boolean> {
    const follows = await this.getFollows()
    return follows.following.includes(userId)
  }

  async getPublishedItems(): Promise<any[]> {
    return (await this.getFile("published.json")) || []
  }

  async addPublishedItem(item: any): Promise<void> {
    const items = await this.getPublishedItems()
    items.push({ ...item, id: crypto.randomUUID(), publishedBy: this.username, publishedAt: new Date().toISOString() })
    await this.updateFile("published.json", items, "Publish item")
  }

  async getAIConnection(): Promise<any> {
    return (await this.getFile("ai-connection.json")) || { connected: false, sessions: [] }
  }

  async updateAIConnection(connection: any): Promise<void> {
    await this.updateFile("ai-connection.json", connection, "Update AI connection")
  }

  async syncWithAI(sessionId: string): Promise<void> {
    const connection = await this.getAIConnection()
    const sessions = connection.sessions || []
    if (!sessions.includes(sessionId)) {
      sessions.push(sessionId)
    }
    connection.connected = true
    connection.sessions = sessions
    connection.lastSync = new Date().toISOString()
    await this.updateAIConnection(connection)
  }

  async getChatMessages(): Promise<any[]> {
    return (await this.getFile("community_chat.json")) || []
  }

  async addChatMessage(message: any): Promise<void> {
    const messages = await this.getChatMessages()
    messages.push(message)
    await this.updateFile("community_chat.json", messages, `Chat message from ${message.username}`)
  }

  async likeChatMessage(messageId: string, userId: string): Promise<void> {
    const messages = await this.getChatMessages()
    const msg = messages.find((m: any) => m.id === messageId)
    if (msg) {
      if (!msg.likes) msg.likes = []
      if (!msg.likes.includes(userId)) {
        msg.likes.push(userId)
      }
      await this.updateFile("community_chat.json", messages, `Like message: ${messageId}`)
    }
  }

  async getMarketplaceItems(): Promise<any[]> {
    return (await this.getFile("marketplace.json")) || []
  }

  async addMarketplaceItem(item: any): Promise<void> {
    const items = await this.getMarketplaceItems()
    items.push({ ...item, id: crypto.randomUUID(), listedBy: this.username, listedAt: new Date().toISOString() })
    await this.updateFile("marketplace.json", items, "Add marketplace item")
  }

  async get(key: string): Promise<any> {
    return this.getFile(`${key}.json`)
  }

  async set(key: string, value: any): Promise<void> {
    const path = `${key}.json`
    const current = await fetch(`${GITHUB_API}/repos/${this.username}/${this.repoName}/contents/${path}`, {
      headers: this.headers,
    })
    if (current.status === 404) {
      await this.createFile(path, JSON.stringify(value, null, 2))
      return
    }
    await this.updateFile(path, value, `Update ${key}`)
  }

  async getStats(): Promise<{ totalLikes: number; totalComments: number; totalFollowers: number; totalFollowing: number; totalPublished: number }> {
    const [likes, comments, follows, published] = await Promise.all([
      this.getLikes(),
      this.getComments(),
      this.getFollows(),
      this.getPublishedItems(),
    ])
    return {
      totalLikes: likes.length,
      totalComments: comments.length,
      totalFollowers: follows.followers.length,
      totalFollowing: follows.following.length,
      totalPublished: published.length,
    }
  }
}

let storageInstance: GitHubDataStorage | null = null

export function getGitHubStorage(): GitHubDataStorage | null {
  return storageInstance
}

export function initGitHubStorage(token: string, username: string): GitHubDataStorage {
  storageInstance = new GitHubDataStorage(token, username)
  return storageInstance
}

export function clearGitHubStorage(): void {
  storageInstance = null
}
