import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

type Share = {
  id: string;
  sessionID: string;
  timeCreated: string;
  timeUpdated: string;
  session: Record<string, any> | null;
  messages: Record<string, any>[];
  parts: Record<string, any>[];
  diffs: Record<string, any>[];
  models: Record<string, any>[];
};

export const Route = createFileRoute('/share/$id')({
  head: ({ params }) => {
    const title = `ZYRAXON Shared Session — ${params.id}`;
    const description = 'A published ZYRAXON AI coding session: prompts, AI responses, code and file diffs.';
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'article' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
    };
  },
  component: SharePage,
});

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative my-3 overflow-hidden rounded-lg border border-white/10 bg-black/50">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-cyan-300/70">
        <span>{lang || 'code'}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded px-2 py-0.5 text-[11px] text-slate-300 transition hover:bg-white/10"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderContent(content: string) {
  const blocks = content.split(/```/g);
  return blocks.map((block, i) => {
    if (i % 2 === 1) {
      const nl = block.indexOf('\n');
      const lang = nl > 0 ? block.slice(0, nl).trim() : '';
      const code = nl > 0 ? block.slice(nl + 1) : block;
      return <CodeBlock key={i} code={code.replace(/\s+$/, '')} lang={lang} />;
    }
    return (
      <p key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">
        {block}
      </p>
    );
  });
}

function SharePage() {
  const { id } = Route.useParams();
  const [share, setShare] = useState<Share | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/public/shares/${id}/data`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error || `Request failed (${r.status})`);
        return body as Share;
      })
      .then((data) => alive && setShare(data))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  const partsByMessage = useMemo(() => {
    const map = new Map<string, Record<string, any>[]>();
    for (const p of share?.parts ?? []) {
      const key = String(p['messageID'] ?? '');
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return map;
  }, [share]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Share unavailable</h1>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
        </div>
      </main>
    );
  }

  if (!share) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <p className="text-sm text-slate-400">Loading shared session…</p>
      </main>
    );
  }

  const title = (share.session?.['title'] as string) || 'Untitled session';

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-slate-200">
      <header className="border-b border-white/10 bg-gradient-to-b from-cyan-500/10 to-transparent">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">ZYRAXON AI · Shared session</p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
            <p className="mt-1 text-xs text-slate-400">
              Created {new Date(share.timeCreated).toLocaleString()} · Updated{' '}
              {new Date(share.timeUpdated).toLocaleString()}
            </p>
            {share.models.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {share.models.map((m, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-200"
                  >
                    {(m['name'] as string) || `${m['providerID']}/${m['modelID']}`}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="self-start rounded-md border border-white/15 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/10"
          >
            {copied ? 'Link copied' : 'Share'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8">
        <section className="space-y-5">
          {share.messages.length === 0 && (
            <p className="text-sm text-slate-500">No messages have been synced to this share yet.</p>
          )}
          {share.messages.map((msg, i) => {
            const role = String(msg['role'] ?? 'assistant');
            const isUser = role === 'user';
            const extraParts = partsByMessage.get(String(msg['id'] ?? '')) ?? [];
            return (
              <article
                key={String(msg['id'] ?? i)}
                className={`rounded-xl border p-4 ${
                  isUser ? 'border-cyan-400/25 bg-cyan-400/[0.06]' : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400">
                  <span className={isUser ? 'text-cyan-300' : 'text-fuchsia-300'}>{isUser ? 'You' : 'ZYRAXON'}</span>
                  {msg['model'] ? <span>· {String(msg['model'])}</span> : null}
                  {msg['timeCreated'] ? <span>· {new Date(String(msg['timeCreated'])).toLocaleString()}</span> : null}
                </div>
                {renderContent(String(msg['content'] ?? ''))}
                {extraParts.map((p, j) => (
                  <div key={j}>{renderContent(String(p['content'] ?? ''))}</div>
                ))}
              </article>
            );
          })}
        </section>

        {share.diffs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">File changes</h2>
            <div className="mt-4 space-y-4">
              {share.diffs.map((d, i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-sm">
                    <span className="font-mono text-slate-200">{String(d['path'] ?? 'file')}</span>
                    <span className="font-mono text-xs">
                      <span className="text-emerald-400">+{Number(d['additions'] ?? 0)}</span>{' '}
                      <span className="text-rose-400">-{Number(d['deletions'] ?? 0)}</span>
                    </span>
                  </div>
                  <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
                    {String(d['content'] ?? '')
                      .split('\n')
                      .map((line, k) => (
                        <div
                          key={k}
                          className={
                            line.startsWith('+')
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : line.startsWith('-')
                                ? 'bg-rose-500/10 text-rose-300'
                                : 'text-slate-300'
                          }
                        >
                          {line || ' '}
                        </div>
                      ))}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-slate-500">
          Published with ZYRAXON AI · share id {share.id}
        </footer>
      </div>
    </main>
  );
}
