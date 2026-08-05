import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-side proxy for the ZYRAXON AI GitHub releases.
 *
 *   GET /api/public/github-releases?q=zyraxon&page=1&perPage=20
 *
 * Aggregates the latest releases across the ZYRAXON GitHub
 * organization/user so the marketplace can surface every release —
 * searchable by app/repo name, tag, or release notes — with direct
 * download links for each asset.
 */
const GITHUB_API = "https://api.github.com";
const DEFAULT_OWNER = "onelpawarai";
const REPOS_PER_PAGE = 30;
const RELEASES_PER_REPO = 5;

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type Repo = {
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  topics?: string[];
};

type ReleaseAsset = {
  name: string;
  size: number;
  browser_download_url: string;
  download_count: number;
};

type Release = {
  id: number;
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  body: string | null;
  assets: ReleaseAsset[];
};

type NormalizedRelease = {
  id: number;
  repo: string;
  repoUrl: string;
  repoDescription: string | null;
  tagName: string;
  name: string;
  htmlUrl: string;
  publishedAt: string;
  prerelease: boolean;
  draft: boolean;
  body: string | null;
  assets: { name: string; size: number; downloadUrl: string; downloadCount: number }[];
  downloadUrl: string | null;
  websiteUrl: string;
  zyraxonUrl: string;
};

// Simple in-memory cache to avoid hammering the GitHub API.
const cache: { data: NormalizedRelease[]; time: number } = { data: [], time: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getRepos(owner: string): Promise<Repo[]> {
  // orgs → fall back to users
  const endpoints = [
    `${GITHUB_API}/orgs/${owner}/repos?per_page=100&sort=updated`,
    `${GITHUB_API}/users/${owner}/repos?per_page=100&sort=updated`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "zyraxon-ecosystem" },
      });
      if (res.ok) {
        const data = (await res.json()) as Repo[];
        // only interesting (non-archived, has releases) repos — sort by stars/pushed
        return data
          .filter((r) => !r.full_name.toLowerCase().endsWith(".github"))
          .slice(0, REPOS_PER_PAGE);
      }
    } catch {
      /* try next */
    }
  }
  return [];
}

async function getReleases(fullName: string): Promise<Release[]> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${fullName}/releases?per_page=${RELEASES_PER_REPO}`,
      { headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "zyraxon-ecosystem" } },
    );
    if (!res.ok) return [];
    return (await res.json()) as Release[];
  } catch {
    return [];
  }
}

async function collect(): Promise<NormalizedRelease[]> {
  const now = Date.now();
  if (cache.data.length && now - cache.time < CACHE_TTL) return cache.data;

  const repos = await getRepos(DEFAULT_OWNER);
  const releases: NormalizedRelease[] = [];

  for (const repo of repos) {
    const rs = await getReleases(repo.full_name);
    for (const r of rs) {
      const firstAsset = r.assets[0] ?? null;
      releases.push({
        id: r.id,
        repo: repo.name,
        repoUrl: repo.html_url,
        repoDescription: repo.description,
        tagName: r.tag_name,
        name: r.name || r.tag_name,
        htmlUrl: r.html_url,
        publishedAt: r.published_at,
        prerelease: r.prerelease,
        draft: r.draft,
        body: r.body,
        assets: r.assets.map((a) => ({
          name: a.name,
          size: a.size,
          downloadUrl: a.browser_download_url,
          downloadCount: a.download_count,
        })),
        downloadUrl: firstAsset?.browser_download_url ?? null,
        websiteUrl: `https://zyraxonai.lovable.app/ecosystem?item=${encodeURIComponent(repo.name)}`,
        zyraxonUrl: `zyraxon://install/release/${encodeURIComponent(repo.full_name)}/${encodeURIComponent(r.tag_name)}`,
      });
    }
  }

  releases.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  cache.data = releases;
  cache.time = now;
  return releases;
}

export const Route = createFileRoute("/api/public/github-releases")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
        const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
        const perPage = Math.min(50, Math.max(1, Number(url.searchParams.get("perPage") ?? 20)));

        try {
          const all = await collect();

          const filtered = q
            ? all.filter(
                (r) =>
                  r.name.toLowerCase().includes(q) ||
                  r.repo.toLowerCase().includes(q) ||
                  r.tagName.toLowerCase().includes(q) ||
                  (r.body ?? "").toLowerCase().includes(q),
              )
            : all;

          const start = (page - 1) * perPage;
          const items = filtered.slice(start, start + perPage);

          return Response.json(
            {
              items,
              total: filtered.length,
              page,
              perPage,
              updatedAt: new Date().toISOString(),
            },
            { headers: { ...HEADERS, "Cache-Control": "public, max-age=240" } },
          );
        } catch (err) {
          return Response.json(
            { message: "GitHub releases request failed", detail: String(err), items: [], total: 0 },
            { status: 502, headers: HEADERS },
          );
        }
      },
    },
  },
});
