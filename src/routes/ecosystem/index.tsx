import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';

const GITHUB_API = "https://api.github.com";
const GITHUB_REPO = "onelpawarai/ZYRAXON-AI";
const MARKETPLACE_PATH = "/marketplace/published/index.json";
const SAMPLE_PATHS = [
  "/marketplace/plugins/index.json",
  "/marketplace/bots/index.json",
  "/marketplace/templates/index.json",
];
const CACHE_KEY = "zyraxon_marketplace_cache";
const CACHE_TTL = 30000;

type MarketplaceItem = {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  authorAvatar?: string;
  authorId: string;
  category: string;
  type: string;
  tags: string[];
  coverImage?: string;
  logo?: string;
  downloads: number;
  rating: number;
  reviews: number;
  likeCount: number;
  commentCount: number;
  verified: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  platforms?: string[];
  downloadUrl?: string;
  installCommand?: string;
  fileSize?: string;
  license?: string;
  liveDemo?: string;
  repository?: string;
};

type CategoryInfo = {
  id: string;
  name: string;
  icon: string;
  description: string;
  count: number;
};

const CATEGORIES: CategoryInfo[] = [
  { id: "all", name: "All", icon: "grid", description: "Browse everything", count: 0 },
  { id: "ai-bots", name: "AI Bots", icon: "bot", description: "Custom AI assistants", count: 0 },
  { id: "plugins", name: "Plugins", icon: "puzzle", description: "Extend ZYRAXON", count: 0 },
  { id: "website-templates", name: "Templates", icon: "layout", description: "Website starters", count: 0 },
  { id: "themes", name: "Themes", icon: "palette", description: "UI themes", count: 0 },
  { id: "components", name: "Components", icon: "box", description: "Reusable UI parts", count: 0 },
  { id: "desktop-apps", name: "Desktop Apps", icon: "monitor", description: "Win/Mac/Linux apps", count: 0 },
  { id: "mobile-apps", name: "Mobile Apps", icon: "smartphone", description: "Android/iOS apps", count: 0 },
  { id: "ai-models", name: "AI Models", icon: "cpu", description: "Pre-trained models", count: 0 },
  { id: "tools", name: "Dev Tools", icon: "wrench", description: "Developer utilities", count: 0 },
  { id: "cli-tools", name: "CLI Tools", icon: "terminal", description: "Command-line tools", count: 0 },
  { id: "sdks", name: "SDKs", icon: "package", description: "Dev kits", count: 0 },
  { id: "fonts", name: "Fonts", icon: "type", description: "Custom fonts", count: 0 },
  { id: "iso-images", name: "ISO Images", icon: "disc", description: "Bootable images", count: 0 },
  { id: "devops", name: "DevOps", icon: "rocket", description: "CI/CD & Docker", count: 0 },
  { id: "pdfs", name: "PDFs", icon: "file-text", description: "Docs & guides", count: 0 },
  { id: "books", name: "Books", icon: "book", description: "E-books", count: 0 },
  { id: "prompts", name: "AI Prompts", icon: "message", description: "Prompt templates", count: 0 },
  { id: "datasets", name: "Datasets", icon: "database", description: "Training data", count: 0 },
  { id: "code-snippets", name: "Snippets", icon: "code", description: "Code patterns", count: 0 },
  { id: "apis", name: "APIs", icon: "globe", description: "API integrations", count: 0 },
  { id: "browser-extensions", name: "Extensions", icon: "extension", description: "Browser add-ons", count: 0 },
  { id: "landing-pages", name: "Landing Pages", icon: "layout", description: "Marketing pages", count: 0 },
  { id: "ui-kits", name: "UI Kits", icon: "layers", description: "Design systems", count: 0 },
  { id: "icons", name: "Icons", icon: "image", description: "Icon packs", count: 0 },
  { id: "startkits", name: "Starter Kits", icon: "rocket", description: "Project starters", count: 0 },
  { id: "workflows", name: "Workflows", icon: "zap", description: "Automation flows", count: 0 },
  { id: "types", name: "Types", icon: "file", description: "TS type defs", count: 0 },
];

const CATEGORY_ICONS_SVG: Record<string, string> = {
  grid: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  bot: "M12 2a4 4 0 014 4v2h2a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h2V6a4 4 0 014-4zm-2 10a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2z",
  puzzle: "M20.5 11H19V7a2 2 0 00-2-2h-4V3.5a2.5 2.5 0 00-5 0V5H4a2 2 0 00-2 2v3.8h1.5a2.5 2.5 0 010 5H2V20a2 2 0 002 2h3.8v-1.5a2.5 2.5 0 015 0V22H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 100-5z",
  layout: "M3 3h18v18H3zm2 2v14h14V5z",
  palette: "M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10a2.5 2.5 0 002.5-2.5c0-.61-.23-1.21-.64-1.67A1.37 1.37 0 0113.5 17c0-.76.62-1.38 1.38-1.38H17a5 5 0 005-5c0-4.96-4.49-8-10-8z",
  monitor: "M3 4h18v12H3zm6 14h6",
  smartphone: "M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm5 18a1 1 0 100-2 1 1 0 000-2z",
  cpu: "M4 4h16v16H4zm4 4h8v8H8z",
  wrench: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  terminal: "M4 4h16v16H4zm2 4l4 4-4 4m4-8h8",
  package: "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  type: "M4 7V4h16v3M9 20h6M12 4v16",
  disc: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z",
  rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zm12.9-1.5a2.18 2.18 0 00-2.91-.09c-.84.71-2.13.7-2.91-.09-1.5-1.5-2.24-5-2.24-5s3.5.74 5 2.24z",
  "file-text": "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
  book: "M4 4h16v16H4zm2 2v12h12V6z",
  message: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  database: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  globe: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10A15 15 0 0112 2z",
  extension: "M20.5 11H19V7a2 2 0 00-2-2h-4V3.5a2.5 2.5 0 00-5 0V5H4a2 2 0 00-2 2v3.8h1.5a2.5 2.5 0 010 5H2V20a2 2 0 002 2h3.8v-1.5a2.5 2.5 0 015 0V22H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 100-5z",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  image: "M3 3h18v18H3zm5 12l3-4 2 3 3-4 4 5H4z",
  zap: "M13 2L3 14h9l-1 10 10-12h-9l1-10z",
  box: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
};

function SvgIcon({ name, size = 16 }: { name: string; size?: number }) {
  const d = CATEGORY_ICONS_SVG[name] || CATEGORY_ICONS_SVG.box;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORIES.find((c) => c.id === category);
  const label = cat?.name || category;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
      {cat && <SvgIcon name={cat.icon} size={12} />}
      {label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const labels: Record<string, string> = { windows: "Windows", macos: "macOS", linux: "Linux", android: "Android", ios: "iOS", web: "Web" };
  const colors: Record<string, string> = {
    windows: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    macos: "bg-slate-400/15 text-slate-300 border-slate-400/20",
    linux: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    android: "bg-green-500/15 text-green-400 border-green-500/20",
    ios: "bg-slate-300/15 text-slate-200 border-slate-300/20",
    web: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${colors[platform] || "bg-white/10 text-slate-400 border-white/10"}`}>
      {labels[platform] || platform}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-amber-400">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {rating.toFixed(1)}
    </span>
  );
}

export const Route = createFileRoute('/ecosystem')({
  head: () => ({
    meta: [
      { title: "ZYRAXON Ecosystem - Marketplace" },
      { name: "description", content: "Discover plugins, bots, templates, desktop apps, mobile apps, and more in the ZYRAXON Ecosystem marketplace." },
      { property: "og:title", content: "ZYRAXON Ecosystem - Marketplace" },
      { property: "og:description", content: "Discover plugins, bots, templates, and more." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: EcosystemPage,
});

function EcosystemPage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"trending" | "newest" | "top-rated">("trending");

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, time } = JSON.parse(cached);
        if (Date.now() - time < CACHE_TTL) {
          setItems(data);
          setLoading(false);
          return;
        }
      } catch {}
    }

    let alive = true;
    async function load() {
      try {
        const headers: Record<string, string> = {};
        const fetchJson = async (path: string) => {
          const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents${path}`, { headers });
          if (!res.ok) return [];
          const data = await res.json();
          if (data.content) return JSON.parse(atob(data.content.replace(/\n/g, "")));
          if (Array.isArray(data)) return data;
          if (data.items) return data.items;
          return [];
        };

        const [published, plugins, bots, templates] = await Promise.all([
          fetchJson(MARKETPLACE_PATH),
          ...SAMPLE_PATHS.map(fetchJson),
        ]);

        const allGithub = [...published, ...plugins, ...bots, ...templates];
        const result: MarketplaceItem[] = allGithub.length > 0 ? allGithub : [];
        if (!alive) return;
        setItems(result);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, time: Date.now() }));
      } catch (e: any) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedCategory !== "all") {
      result = result.filter((i) => i.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (sortBy === "trending") result = [...result].sort((a, b) => b.downloads - a.downloads);
    else if (sortBy === "newest") result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sortBy === "top-rated") result = [...result].sort((a, b) => b.rating - a.rating);
    return result;
  }, [items, selectedCategory, searchQuery, sortBy]);

  const featuredItems = useMemo(() => items.filter((i) => i.featured).slice(0, 4), [items]);

  const handleDownload = (item: MarketplaceItem) => {
    if (item.downloadUrl) {
      const a = document.createElement("a");
      a.href = item.downloadUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleInstall = (item: MarketplaceItem) => {
    if (item.installCommand) {
      navigator.clipboard.writeText(item.installCommand);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading marketplace...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-400">{error}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-cyan-400 hover:underline">Go Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-slate-200">
      <header className="border-b border-white/10 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent">
        <div className="mx-auto max-w-7xl px-5 py-12 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70 mb-3">ZYRAXON Ecosystem</p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Marketplace</h1>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto">Discover plugins, bots, templates, desktop apps, mobile apps, fonts, and more — built by the community.</p>
          <div className="mt-6 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search marketplace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition"
            />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <span className="text-slate-500">{items.length} items</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">{categoryCounts["desktop-apps"] || 0} desktop apps</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">{categoryCounts["mobile-apps"] || 0} mobile apps</span>
          </div>
        </div>
      </header>

      {featuredItems.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-8">
          <h2 className="text-lg font-semibold text-white mb-4">Featured</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredItems.map((item) => (
              <Link
                key={item.id}
                to="/ecosystem/item/$id"
                params={{ id: item.id }}
                className="group rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-cyan-500/30 transition-all hover:bg-white/[0.06]"
              >
                <div className="h-36 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 relative overflow-hidden">
                  {item.coverImage && (
                    <img src={item.coverImage} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                    <p className="text-xs text-white/60">v{item.version}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <StarRating rating={item.rating} />
                    <span className="text-xs text-slate-500">{item.downloads.toLocaleString()} downloads</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORIES.filter((c) => c.id === "all" || (categoryCounts[c.id] || 0) > 0).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
              }`}
            >
              <SvgIcon name={cat.icon} size={12} />
              {cat.name}
              <span className="text-[10px] opacity-60">{categoryCounts[cat.id] || 0}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {selectedCategory === "all" ? "All Items" : CATEGORIES.find((c) => c.id === selectedCategory)?.name}
          </h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 outline-none"
          >
            <option value="trending">Trending</option>
            <option value="newest">Newest</option>
            <option value="top-rated">Top Rated</option>
          </select>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg text-slate-400">No items found</p>
            <p className="text-sm text-slate-500 mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-white/20 transition-all group">
                <Link to="/ecosystem/item/$id" params={{ id: item.id }} className="block">
                  <div className="h-40 bg-gradient-to-br from-white/5 to-white/[0.02] relative overflow-hidden">
                    {item.coverImage && (
                      <img src={item.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    )}
                    {!item.coverImage && (
                      <div className="flex items-center justify-center h-full">
                        {item.logo ? (
                          <img src={item.logo} alt="" className="w-16 h-16 rounded-xl" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-2xl font-bold text-white/60">
                            {item.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {item.verified && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-500/15 border border-green-500/20 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                          Verified
                        </span>
                      )}
                      {item.featured && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                          Featured
                        </span>
                      )}
                    </div>
                    {item.platforms && item.platforms.length > 0 && (
                      <div className="absolute bottom-3 left-3 flex gap-1">
                        {item.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <Link to="/ecosystem/item/$id" params={{ id: item.id }} className="block">
                        <h3 className="text-sm font-bold text-white truncate hover:text-cyan-300 transition">{item.name}</h3>
                      </Link>
                      <p className="text-xs text-slate-500">by {item.author}</p>
                    </div>
                    <span className="text-xs text-slate-600 shrink-0">v{item.version}</span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{item.description}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    <CategoryBadge category={item.category} />
                    {item.license && (
                      <span className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {item.license}
                      </span>
                    )}
                    {item.fileSize && (
                      <span className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {item.fileSize}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <StarRating rating={item.rating} />
                    <span>{item.downloads.toLocaleString()} downloads</span>
                  </div>

                  {item.installCommand ? (
                    <button
                      onClick={() => handleInstall(item)}
                      className="w-full rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition text-center"
                    >
                      Copy Install Command
                    </button>
                  ) : item.downloadUrl ? (
                    <button
                      onClick={() => handleDownload(item)}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition text-center"
                    >
                      Download
                    </button>
                  ) : item.liveDemo ? (
                    <a
                      href={item.liveDemo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition text-center"
                    >
                      Live Demo
                    </a>
                  ) : (
                    <Link
                      to="/ecosystem/item/$id"
                      params={{ id: item.id }}
                      className="block w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition text-center"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 mt-12 py-8 text-center">
        <p className="text-xs text-slate-500">
          ZYRAXON Ecosystem — Powered by GitHub
        </p>
      </footer>
    </main>
  );
}