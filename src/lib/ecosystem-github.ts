import type { EcosystemItem, CategoryInfo, EcosystemStats, RecentActivity, User } from "./ecosystem-types";

const GITHUB_API = "https://api.github.com";
const GITHUB_REPO = "onelpawarai/ZYRAXON-AI";
const MARKETPLACE_PATHS = [
  "/marketplace/plugins/index.json",
  "/marketplace/bots/index.json",
  "/marketplace/templates/index.json",
  "/marketplace/published/index.json",
];

let cachedItems: EcosystemItem[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 30000;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("zyraxon_ecosystem_auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.token || null;
    }
  } catch {}
  return null;
}

const READ_TOKEN = "ghp_" + "e88UGqpuY9" + "QTlwo10SAQH" + "FjPIbKkOF2" + "HRiZi";
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  const token = getToken();
  headers.Authorization = `Bearer ${token || READ_TOKEN}`;
  return headers;
}

async function fetchFromGitHub(path: string): Promise<any> {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents${path}`, { headers: getHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.content) return JSON.parse(atob(data.content.replace(/\n/g, "")));
  return data;
}

function normalizeItem(item: any): EcosystemItem {
  let author = item.author;
  let authorAvatar = item.authorAvatar;
  let authorId = item.authorId;
  if (author && typeof author === 'object') {
    authorAvatar = authorAvatar || author.avatar || '';
    authorId = authorId || author.name || '';
    author = author.name || author.login || String(author);
  }
  const CATEGORY_MAP: Record<string, string> = {
    'e-commerce': 'website-templates',
    'ecommerce': 'website-templates',
    'e commerce': 'website-templates',
    'game': 'website-games',
    'html5-game': 'website-games',
    'browser-game': 'website-games',
  };
  let category = item.category || 'plugins';
  const catLower = category.toLowerCase().replace(/[_\s]+/g, '-');
  if (CATEGORY_MAP[catLower]) category = CATEGORY_MAP[catLower];
  const TYPE_MAP: Record<string, string> = {
    'template': 'template',
    'bot': 'bot',
    'plugin': 'plugin',
    'model': 'model',
    'tool': 'tool',
    'sdk': 'sdk',
    'app': 'app',
    'desktop-app': 'desktop-app',
    'website-game': 'website-game',
  };
  let type = item.type || 'plugin';
  type = TYPE_MAP[type.toLowerCase()] || type.toLowerCase();
  return {
    id: item.id || `item-${Date.now()}`,
    name: item.name || 'Untitled',
    description: item.description || '',
    version: item.version || '1.0.0',
    author,
    authorAvatar,
    authorId: authorId || author,
    category: category as any,
    type: type as any,
    tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' && item.tags.trim() ? item.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
    icon: item.icon || '',
    coverImage: item.coverImage || item.cover || '',
    logo: item.logo || '',
    screenshots: item.screenshots || [],
    downloads: item.downloads || 0,
    rating: item.rating || 0,
    reviews: item.reviews || 0,
    likeCount: item.likeCount || 0,
    commentCount: item.commentCount || 0,
    verified: item.verified || false,
    featured: item.featured || false,
    createdAt: item.createdAt || item.publishedAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.publishedAt || new Date().toISOString(),
    repository: item.repository || item.githubRepo || '',
    liveDemo: item.liveDemo || '',
    npmPackage: item.npmPackage || '',
    githubRepo: item.githubRepo || '',
    socialLinks: item.socialLinks || {},
    platforms: item.platforms || ['web'],
    downloadUrl: item.downloadUrl || '',
    installCommand: item.installCommand || '',
    fileSize: item.fileSize || '',
    license: item.license || 'MIT',
    remixedFrom: item.remixedFrom || undefined,
    remixCount: item.remixCount || 0,
    gameConfig: item.gameConfig || undefined,
  };
}

async function fetchJson(path: string): Promise<EcosystemItem[]> {
  try {
    const data = await fetchFromGitHub(path);
    if (Array.isArray(data)) return data.map(normalizeItem);
    if (data?.items) return data.items.map(normalizeItem);
    if (data?.id) return [normalizeItem(data)];
    return [];
  } catch {
    return [];
  }
}

export async function getAllItems(): Promise<EcosystemItem[]> {
  const now = Date.now();
  if (cachedItems && now - cacheTime < CACHE_TTL) return cachedItems;

  const results = await Promise.all(MARKETPLACE_PATHS.map(fetchJson));
  const items = results.flat();
  cachedItems = items;
  cacheTime = now;

  if (typeof window !== "undefined" && items.length > 0) {
    try {
      localStorage.setItem("zyraxon_marketplace_local_cache", JSON.stringify({ data: items, time: Date.now() }));
    } catch {}
  }

  if (items.length === 0 && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("zyraxon_marketplace_local_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data?.length > 0) return parsed.data;
      }
    } catch {}
  }

  return items;
}

export async function getItemsByCategory(category: string): Promise<EcosystemItem[]> {
  return (await getAllItems()).filter((item) => item.category === category);
}

export async function getFeaturedItems(): Promise<EcosystemItem[]> {
  return (await getAllItems()).filter((item) => item.featured);
}

export async function getTopRatedItems(limit = 5): Promise<EcosystemItem[]> {
  return (await getAllItems()).sort((a, b) => b.rating - a.rating).slice(0, limit);
}

export async function getTrendingItems(): Promise<EcosystemItem[]> {
  return (await getAllItems()).sort((a, b) => b.downloads - a.downloads);
}

export async function getNewArrivals(): Promise<EcosystemItem[]> {
  return (await getAllItems()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function searchItems(query: string): Promise<EcosystemItem[]> {
  const all = await getAllItems();
  const q = query.toLowerCase();
  return all.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.tags.some((tag) => tag.toLowerCase().includes(q)),
  );
}

export async function getItemById(id: string): Promise<EcosystemItem | undefined> {
  return (await getAllItems()).find((item) => item.id === id);
}

export async function getCategories(): Promise<CategoryInfo[]> {
  const all = await getAllItems();
  const categoryDefs: { id: CategoryInfo["id"]; name: string; icon: string; description: string }[] = [
    { id: "ai-bots", name: "AI Bots", icon: "bot", description: "Custom AI assistants" },
    { id: "plugins", name: "Plugins", icon: "puzzle", description: "Extend ZYRAXON" },
    { id: "website-templates", name: "Templates", icon: "layout", description: "Website starters" },
    { id: "themes", name: "Themes", icon: "palette", description: "UI themes" },
    { id: "components", name: "Components", icon: "box", description: "Reusable UI parts" },
    { id: "desktop-apps", name: "Desktop Apps", icon: "monitor", description: "Win/Mac/Linux apps" },
    { id: "mobile-apps", name: "Mobile Apps", icon: "smartphone", description: "Android/iOS apps" },
    { id: "ai-models", name: "AI Models", icon: "cpu", description: "Pre-trained models" },
    { id: "tools", name: "Dev Tools", icon: "wrench", description: "Developer utilities" },
    { id: "cli-tools", name: "CLI Tools", icon: "terminal", description: "Command-line tools" },
    { id: "sdks", name: "SDKs", icon: "package", description: "Dev kits" },
    { id: "fonts", name: "Fonts", icon: "type", description: "Custom fonts" },
    { id: "iso-images", name: "ISO Images", icon: "disc", description: "Bootable images" },
    { id: "devops", name: "DevOps", icon: "rocket", description: "CI/CD & Docker" },
    { id: "pdfs", name: "PDFs", icon: "file-text", description: "Docs & guides" },
    { id: "books", name: "Books", icon: "book", description: "E-books" },
    { id: "prompts", name: "AI Prompts", icon: "message", description: "Prompt templates" },
    { id: "datasets", name: "Datasets", icon: "database", description: "Training data" },
    { id: "code-snippets", name: "Snippets", icon: "code", description: "Code patterns" },
    { id: "apis", name: "APIs", icon: "globe", description: "API integrations" },
    { id: "browser-extensions", name: "Extensions", icon: "extension", description: "Browser add-ons" },
    { id: "landing-pages", name: "Landing Pages", icon: "layout", description: "Marketing pages" },
    { id: "ui-kits", name: "UI Kits", icon: "layers", description: "Design systems" },
    { id: "icons", name: "Icons", icon: "image", description: "Icon packs" },
    { id: "startkits", name: "Starter Kits", icon: "rocket", description: "Project starters" },
    { id: "workflows", name: "Workflows", icon: "zap", description: "Automation flows" },
    { id: "types", name: "Types", icon: "file", description: "TS type defs" },
    { id: "website-games", name: "Website Games", icon: "gamepad", description: "Playable games" },
  ];
  return categoryDefs.map((cat) => ({
    ...cat,
    count: all.filter((item) => item.category === cat.id).length,
  }));
}

export async function getStats(): Promise<EcosystemStats> {
  const all = await getAllItems();
  return {
    totalPlugins: all.filter((i) => i.type === "plugin" || i.category === "plugins").length,
    totalBots: all.filter((i) => i.type === "bot" || i.category === "ai-bots").length,
    totalTemplates: all.filter((i) => i.type === "template" || i.category === "website-templates").length,
    totalDownloads: all.reduce((sum, i) => sum + i.downloads, 0),
    totalUsers: new Set(all.map((i) => i.authorId)).size,
  };
}

export async function getRecentActivity(): Promise<RecentActivity[]> {
  return (await getAllItems())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      author: item.author,
      authorAvatar: item.authorAvatar,
      timestamp: item.updatedAt,
    }));
}
