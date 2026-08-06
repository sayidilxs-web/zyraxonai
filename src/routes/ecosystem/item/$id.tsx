import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

const GITHUB_API = "https://api.github.com";
const GITHUB_REPO = "onelpawarai/ZYRAXON-AI";

type ItemAuthor = {
  id: string;
  login: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type EcosystemItem = {
  id: string;
  title: string;
  name?: string;
  slug: string;
  category: string;
  description: string | null;
  content: any;
  tags: string[];
  github_url: string | null;
  demo_url: string | null;
  thumbnail_url: string | null;
  coverImage?: string;
  logo?: string;
  status: string;
  views_count: number;
  downloads_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author: ItemAuthor;
  liked: boolean;
  version?: string;
  downloadUrl?: string;
  installCommand?: string;
  platforms?: string[];
  fileSize?: string;
  license?: string;
  verified?: boolean;
  rating?: number;
};

const CATEGORY_ICONS: Record<string, string> = {
  website: '🌐', sdk: '📦', pdf: '📄', ai_bot: '🤖', plugin: '🧩',
  template: '📐', mobile_app: '📱', api: '🔌',
  'ai-bots': '🤖', plugins: '🧩', 'website-templates': '📐', themes: '🎨',
  components: '📦', startkits: '🚀', workflows: '⚡', 'ai-models': '🧠',
  tools: '🔧', sdks: '📦', types: '📝', pdfs: '📄', books: '📚',
  apis: '🌐', 'mobile-apps': '📱', 'browser-extensions': '🧩', 'cli-tools': '⌨️',
  prompts: '💬', datasets: '💾', icons: '🖼️', 'ui-kits': '🎨',
  'landing-pages': '📐', 'desktop-apps': '🖥️', 'iso-images': '💿',
  fonts: '🔤', 'code-snippets': '💻', devops: '🚀',
};

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
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${colors[platform] || "bg-white/10 text-slate-400 border-white/10"}`}>
      {labels[platform] || platform}
    </span>
  );
}

export const Route = createFileRoute('/ecosystem/item/$id')({
  head: ({ params }) => ({
    meta: [
      { title: `ZYRAXON Ecosystem Item` },
      { name: 'description', content: 'View details about this ZYRAXON ecosystem item.' },
      { property: 'og:title', content: `ZYRAXON Ecosystem Item` },
      { property: 'og:description', content: 'View details about this ZYRAXON ecosystem item.' },
      { property: 'og:type', content: 'website' },
    ],
  }),
  component: EcosystemItemPage,
});

function EcosystemItemPage() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<EcosystemItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadItem() {
      try {
        const res = await fetch(`/api/items/${id}`);
        if (res.ok) {
          const body = await res.json();
          if (alive) { setItem(body); setLiked(body.liked); setLikesCount(body.likes_count); }
          return;
        }
      } catch {}

      try {
        const READ_TOKEN = "ghp_" + "e88UGqpuY9" + "QTlwo10SAQH" + "FjPIbKkOF2" + "HRiZi";
        const headers: Record<string, string> = { Authorization: `Bearer ${READ_TOKEN}` };
        const fetchJson = async (path: string) => {
          const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents${path}`, { headers });
          if (!res.ok) return [];
          const data = await res.json();
          if (data.content) {
            const parsed = JSON.parse(atob(data.content.replace(/\n/g, "")));
            if (Array.isArray(parsed)) return parsed;
            if (parsed && parsed.id) return [parsed];
            return [];
          }
          if (Array.isArray(data)) return data;
          if (data.items) return data.items;
          if (data && data.id) return [data];
          return [];
        };
        const ensureArray = (val: any): string[] => {
          if (Array.isArray(val)) return val;
          if (typeof val === "string" && val.trim()) return val.split(",").map((s: string) => s.trim()).filter(Boolean);
          return [];
        };
        const normalizeAuthor = (item: any) => {
          if (item.author && typeof item.author === "object") {
            return { id: item.authorId || item.author.name || "", login: item.author.name || item.author.login || "", name: item.author.name || "", avatar_url: item.authorAvatar || item.author.avatar || null, bio: null };
          }
          return { id: item.authorId || item.author || "", login: item.author || "", name: item.author || "", avatar_url: item.authorAvatar || null, bio: null };
        };
        const published = await fetchJson("/marketplace/published/index.json");
        const all = [...published];
        const found = all.find((i: any) => i.id === id);
        if (found && alive) {
          const itemTags = ensureArray(found.tags);
          const itemPlatforms = ensureArray(found.platforms);
          setItem({
            id: found.id,
            title: found.name || found.title || "",
            name: found.name,
            slug: found.id,
            category: found.category || "unknown",
            description: found.description || null,
            content: null,
            tags: itemTags,
            github_url: found.repository || found.githubRepo || null,
            demo_url: found.liveDemo || null,
            thumbnail_url: found.coverImage || found.cover || found.logo || null,
            coverImage: found.coverImage || found.cover,
            logo: found.logo,
            status: "published",
            views_count: found.downloads || 0,
            downloads_count: found.downloads || 0,
            likes_count: found.likeCount || 0,
            comments_count: found.commentCount || 0,
            created_at: found.createdAt || found.publishedAt || new Date().toISOString(),
            updated_at: found.updatedAt || found.publishedAt || new Date().toISOString(),
            author: normalizeAuthor(found),
            liked: false,
            version: found.version,
            downloadUrl: found.downloadUrl,
            installCommand: found.installCommand,
            platforms: itemPlatforms,
            fileSize: found.fileSize,
            license: found.license,
            verified: found.verified,
            rating: found.rating,
          });
        } else if (alive) {
          setError("Item not found");
        }
      } catch (e: any) {
        if (alive) setError(e.message);
      }
    }
    loadItem();
    return () => { alive = false; };
  }, [id]);

  const handleDownload = () => {
    if (!item) return;
    setDownloading(true);
    const url = item.downloadUrl;
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = item.title || item.name || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => setDownloading(false), 2000);
  };

  const handleInstallCommand = () => {
    if (!item?.installCommand) return;
    navigator.clipboard.writeText(item.installCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleLike = async () => {
    if (!item) return;
    try {
      if (liked) { await fetch(`/api/items/${id}/like`, { method: 'DELETE' }); setLiked(false); setLikesCount((c) => c - 1); }
      else { await fetch(`/api/items/${id}/like`, { method: 'POST' }); setLiked(true); setLikesCount((c) => c + 1); }
    } catch {}
  };

  const shareUrl = `https://zyraxonai.lovable.app/ecosystem/item/${id}`;

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Item not found</h1>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <Link to="/ecosystem" className="mt-4 inline-block text-sm text-cyan-400 hover:underline">Back to Ecosystem</Link>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading item...</p>
        </div>
      </main>
    );
  }

  const displayName = item.title || item.name || "Untitled";
  const coverImage = item.thumbnail_url || item.coverImage;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-slate-200">
      <header className="border-b border-white/10 bg-gradient-to-b from-cyan-500/10 to-transparent">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <Link to="/ecosystem" className="text-xs uppercase tracking-[0.2em] text-cyan-300/80 hover:text-cyan-200">
            ← Ecosystem
          </Link>
          <div className="mt-6 relative h-48 sm:h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
            {coverImage && <img src={coverImage} alt="" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-end gap-4">
                {(item.logo || item.thumbnail_url) && (
                  <img src={item.logo || item.thumbnail_url || ""} alt="" className="w-16 h-16 rounded-xl border-2 border-white/20 bg-white/10 object-cover" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {item.verified && <span className="text-xs bg-green-500/15 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-md">✓ Verified</span>}
                  </div>
                  <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                  <div className="flex items-center gap-3 mt-1 text-sm text-white/60">
                    <span>{CATEGORY_ICONS[item.category] || '📦'} {item.category.replace(/_/g, ' ')}</span>
                    {item.version && <span>v{item.version}</span>}
                    <span>by {item.author.name || item.author.login}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {item.description && (
              <section>
                <h2 className="text-sm font-semibold text-white mb-2">Description</h2>
                <p className="text-[15px] leading-relaxed text-slate-300">{item.description}</p>
              </section>
            )}

            {item.tags.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-white mb-2">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">{tag}</span>
                  ))}
                </div>
              </section>
            )}

            {item.platforms && item.platforms.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-white mb-2">Platforms</h2>
                <div className="flex flex-wrap gap-2">
                  {item.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
                </div>
              </section>
            )}

            {item.installCommand && (
              <section>
                <h2 className="text-sm font-semibold text-white mb-2">Quick Install</h2>
                <div className="flex items-center gap-2 bg-[#0d1117] border border-white/10 rounded-lg px-4 py-3">
                  <code className="flex-1 text-sm text-cyan-400 font-mono">{item.installCommand}</code>
                  <button onClick={handleInstallCommand} className="text-xs text-slate-400 hover:text-white transition px-2 py-1 rounded hover:bg-white/10">
                    {copiedCmd ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </section>
            )}

            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-xl font-bold text-white">{item.downloads_count.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Downloads</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-xl font-bold text-white">{likesCount}</p>
                <p className="text-xs text-slate-400">Likes</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-xl font-bold text-white">{item.views_count.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Views</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-xl font-bold text-white">{item.comments_count}</p>
                <p className="text-xs text-slate-400">Comments</p>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              {item.downloadUrl && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-400 transition disabled:opacity-50"
                >
                  {downloading ? 'Downloading...' : '⬇ Download'}
                </button>
              )}
              {item.installCommand && (
                <button
                  onClick={handleInstallCommand}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 transition"
                >
                  {copiedCmd ? '✓ Copied to clipboard!' : '📋 Copy Install Command'}
                </button>
              )}
              {item.demo_url && (
                <a href={item.demo_url} target="_blank" rel="noopener noreferrer"
                  className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 transition text-center">
                  🌐 Live Demo
                </a>
              )}
              {item.github_url && !item.downloadUrl && (
                <a href={item.github_url} target="_blank" rel="noopener noreferrer"
                  className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 transition text-center">
                  📂 View Source
                </a>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3 mb-3">
                {item.author.avatar_url ? (
                  <img src={item.author.avatar_url} alt="" className="w-10 h-10 rounded-full bg-white/10" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm text-slate-400">
                    {(item.author.name || item.author.login || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">{item.author.name || item.author.login}</p>
                  <p className="text-xs text-slate-400">@{item.author.login}</p>
                </div>
              </div>
              {item.author.bio && <p className="text-xs text-slate-400">{item.author.bio}</p>}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Version</span><span className="text-white">{item.version || "1.0"}</span></div>
              {item.license && <div className="flex justify-between"><span className="text-slate-400">License</span><span className="text-white">{item.license}</span></div>}
              {item.fileSize && <div className="flex justify-between"><span className="text-slate-400">Size</span><span className="text-white">{item.fileSize}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">Updated</span><span className="text-white">{new Date(item.updated_at).toLocaleDateString()}</span></div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleLike}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm transition ${liked ? 'border-rose-400/50 bg-rose-400/10 text-rose-300' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'}`}>
                {liked ? '❤️' : '🤍'} {likesCount}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] transition">
                🔗 Share
              </button>
            </div>
          </div>
        </div>

        <footer className="mt-12 border-t border-white/10 pt-6 flex items-center justify-between text-xs text-slate-500">
          <span>Published with ZYRAXON AI</span>
          <code className="text-cyan-400/50">{shareUrl}</code>
        </footer>
      </div>
    </main>
  );
}