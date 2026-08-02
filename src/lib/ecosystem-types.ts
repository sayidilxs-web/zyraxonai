export type Category =
  | "ai-bots" | "plugins" | "website-templates" | "themes" | "components"
  | "startkits" | "workflows" | "ai-models" | "tools" | "sdks" | "types"
  | "pdfs" | "books" | "apis" | "mobile-apps" | "browser-extensions"
  | "cli-tools" | "prompts" | "datasets" | "icons" | "ui-kits"
  | "landing-pages" | "desktop-apps" | "iso-images" | "fonts"
  | "code-snippets" | "devops" | "website-games";

export type ItemType =
  | "plugin" | "template" | "bot" | "model" | "tool" | "sdk" | "api"
  | "app" | "extension" | "cli" | "prompt" | "dataset" | "icon"
  | "ui-kit" | "landing-page" | "workflow" | "pdf" | "book" | "component"
  | "theme" | "startkit" | "desktop-app" | "iso" | "font" | "snippet" | "devops" | "website-game";

export interface EcosystemItem {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  authorAvatar?: string;
  authorId: string;
  category: Category;
  type: ItemType;
  tags: string[];
  icon?: string;
  coverImage?: string;
  logo?: string;
  screenshots?: string[];
  downloads: number;
  rating: number;
  reviews: number;
  likeCount: number;
  commentCount: number;
  verified: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  repository: string;
  liveDemo?: string;
  npmPackage?: string;
  githubRepo?: string;
  socialLinks?: Record<string, string>;
  platforms?: string[];
  downloadUrl?: string;
  installCommand?: string;
  fileSize?: string;
  license?: string;
  remixedFrom?: string;
  remixCount?: number;
  gameConfig?: {
    engine: string;
    width?: number;
    height?: number;
    fullscreen?: boolean;
  };
}

export interface CategoryInfo {
  id: Category;
  name: string;
  icon: string;
  description: string;
  count: number;
}

export interface EcosystemStats {
  totalPlugins: number;
  totalBots: number;
  totalTemplates: number;
  totalDownloads: number;
  totalUsers: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  name: string;
  author: string;
  authorAvatar?: string;
  timestamp: string;
}

export type ViewMode =
  | "home" | "explore" | "categories" | "top-rated" | "trending"
  | "new" | "my-plugins" | "my-downloads" | "my-favorites"
  | "profile" | "community" | "marketplace" | "product-detail"
  | "settings" | "ai-settings";

export interface User {
  id: string;
  githubUserId: number;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio: string;
  title: string;
  skills: string[];
  location: string;
  company: string;
  blog: string;
  followerCount: number;
  followingCount: number;
  publishedCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  content: string;
  timestamp: string;
  likes: number;
  likedBy: string[];
  attachment?: {
    name: string;
    url: string;
    type?: string;
  };
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  content: string;
  itemId: string;
  parentId?: string;
  createdAt: string;
  likeCount: number;
}
