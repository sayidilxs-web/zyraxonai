import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

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
  slug: string;
  category: string;
  description: string | null;
  content: any;
  tags: string[];
  github_url: string | null;
  demo_url: string | null;
  thumbnail_url: string | null;
  status: string;
  views_count: number;
  downloads_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author: ItemAuthor;
  liked: boolean;
};

const CATEGORY_ICONS: Record<string, string> = {
  website: '🌐',
  sdk: '📦',
  pdf: '📄',
  ai_bot: '🤖',
  plugin: '🧩',
  template: '📐',
  mobile_app: '📱',
  api: '🔌',
};

export const Route = createFileRoute('/ecosystem/item/$id')({
  head: ({ params }) => {
    const title = `ZYRAXON Ecosystem Item`;
    const description = 'View details about this ZYRAXON ecosystem item.';
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
      ],
    };
  },
  component: EcosystemItemPage,
});

function EcosystemItemPage() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<EcosystemItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(`/api/items/${id}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error || `Request failed (${r.status})`);
        return body as EcosystemItem;
      })
      .then((data) => {
        if (!alive) return;
        setItem(data);
        setLiked(data.liked);
        setLikesCount(data.likes_count);
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [id]);

  const handleLike = async () => {
    if (!item) return;
    try {
      if (liked) {
        await fetch(`/api/items/${id}/like`, { method: 'DELETE' });
        setLiked(false);
        setLikesCount((c) => c - 1);
      } else {
        await fetch(`/api/items/${id}/like`, { method: 'POST' });
        setLiked(true);
        setLikesCount((c) => c + 1);
      }
    } catch {}
  };

  const shareUrl = `https://zyraxonai.lovable.app/ecosystem/item/${id}`;

  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Item not found</h1>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <Link to="/ecosystem" className="mt-4 inline-block text-sm text-cyan-400 hover:underline">
            Back to Ecosystem
          </Link>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <p className="text-sm text-slate-400">Loading item...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-slate-200">
      <header className="border-b border-white/10 bg-gradient-to-b from-cyan-500/10 to-transparent">
        <div className="mx-auto max-w-4xl px-5 py-8">
          <Link to="/ecosystem" className="text-xs uppercase tracking-[0.2em] text-cyan-300/80 hover:text-cyan-200">
            ← Ecosystem
          </Link>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {item.thumbnail_url && (
                  <img src={item.thumbnail_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">{item.title}</h1>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                    <span>{CATEGORY_ICONS[item.category] || '📁'} {item.category.replace('_', ' ')}</span>
                    <span>·</span>
                    <span>by {item.author.name || item.author.login}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition ${
                  liked
                    ? 'border-rose-400/50 bg-rose-400/10 text-rose-300'
                    : 'border-white/15 text-slate-300 hover:bg-white/10'
                }`}
              >
                {liked ? '❤️' : '🤍'} {likesCount}
              </button>
              <button
                onClick={handleShare}
                className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8">
        {item.description && (
          <section className="mb-8">
            <p className="text-[15px] leading-relaxed text-slate-300">{item.description}</p>
          </section>
        )}

        {item.tags.length > 0 && (
          <section className="mb-8 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
                {tag}
              </span>
            ))}
          </section>
        )}

        <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-bold text-white">{item.views_count}</p>
            <p className="text-xs text-slate-400">Views</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-bold text-white">{item.downloads_count}</p>
            <p className="text-xs text-slate-400">Downloads</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-bold text-white">{likesCount}</p>
            <p className="text-xs text-slate-400">Likes</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-bold text-white">{item.comments_count}</p>
            <p className="text-xs text-slate-400">Comments</p>
          </div>
        </section>

        <section className="flex flex-wrap gap-3">
          {item.github_url && (
            <a
              href={item.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              🐙 GitHub
            </a>
          )}
          {item.demo_url && (
            <a
              href={item.demo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              🚀 Live Demo
            </a>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">About the Author</h2>
          <div className="flex items-center gap-3">
            {item.author.avatar_url && (
              <img src={item.author.avatar_url} alt="" className="h-10 w-10 rounded-full" />
            )}
            <div>
              <p className="font-medium text-slate-200">{item.author.name || item.author.login}</p>
              <p className="text-sm text-slate-400">@{item.author.login}</p>
              {item.author.bio && <p className="mt-1 text-sm text-slate-400">{item.author.bio}</p>}
            </div>
          </div>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-slate-500">
          Published with ZYRAXON AI · item id {item.id}
          <span className="ml-2">· Share URL: <code className="text-cyan-400/70">{shareUrl}</code></span>
        </footer>
      </div>
    </main>
  );
}