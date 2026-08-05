import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-side proxy for GitHub releases — now GLOBAL.
 *
 *   GET /api/public/github-releases?q=chatgpt&page=1&perPage=20
 *   GET /api/public/github-releases?repo=facebook/react
 *
 * Surfaces releases from the ENTIRE GitHub world (any app, bot, tool,
 * extension — anything with a release). With `?q=` we use the GitHub
 * repository search API (sorted by stars) and then fetch the latest
 * releases for the top matches. Without `?q=` we show the ZYRAXON
 * owner's repos plus a trending feed of the most active popular repos.
 *
 * Every item includes direct download links for each asset, plus the
 * website deep link and the `zyraxon://install/release/...` deep link.
 */
const GITHUB_API = "https://api.github.com";
const DEFAULT_OWNER = "onelpawarai";
const REPOS_PER_PAGE = 24;
const RELEASES_PER_REPO = 5;
const GLOBAL_SEARCH_LIMIT = 12; // fetch releases for top N repos only (rate-limit friendly)
const TRENDING_QUERY = "stars:>3000 pushed:>2023-01-01";

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
  owner?: { login: string; avatar_url: string | null };
  stargazers_count?: number;
  language?: string | null;
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
  repoFullName: string;
  repoUrl: string;
  repoDescription: string | null;
  owner: string;
  ownerAvatar: string | null;
  stars: number;
  language: string | null;
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

// Simple in-memory cache (keyed by query) to avoid hammering the GitHub API.
const cache = new Map<string, { data: NormalizedRelease[]; time: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function gh(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "zyraxon-ecosystem" },
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    return null;
  }
}

/** Search repositories across ALL of GitHub (sorted by stars). */
async function searchRepos(query: string, perPage: number): Promise<Repo[]> {
  const res = await gh(
    `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`,
  );
  if (!res || !res.ok) return [];
  const data = (await res.json()) as { items?: Repo[] };
  return data.items ?? [];
}

/** List an org's / user's repos (fallback when there's no search query). */
async function getRepos(owner: string): Promise<Repo[]> {
  const endpoints = [
    `${GITHUB_API}/orgs/${owner}/repos?per_page=100&sort=updated`,
    `${GITHUB_API}/users/${owner}/repos?per_page=100&sort=updated`,
  ];
  for (const url of endpoints) {
    const res = await gh(url);
    if (res && res.ok) {
      const data = (await res.json()) as Repo[];
      return data.filter((r) => !r.full_name.toLowerCase().endsWith(".github")).slice(0, REPOS_PER_PAGE);
    }
  }
  return [];
}

/** Fetch a single repo's releases. */
async function getReleases(fullName: string, perPage: number = RELEASES_PER_REPO): Promise<Release[]> {
  const res = await gh(`${GITHUB_API}/repos/${fullName}/releases?per_page=${perPage}`);
  if (!res || !res.ok) return [];
  return (await res.json()) as Release[];
}

function normalize(repo: Repo, r: Release): NormalizedRelease {
  const firstAsset = r.assets[0] ?? null;
  return {
    id: r.id,
    repo: repo.name,
    repoFullName: repo.full_name,
    repoUrl: repo.html_url,
    repoDescription: repo.description,
    owner: repo.owner?.login ?? "",
    ownerAvatar: repo.owner?.avatar_url ?? null,
    stars: repo.stargazers_count ?? 0,
    language: repo.language ?? null,
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
  };
}

/** Concurrency-safe batch fetch for releases across many repos. */
async function releasesForRepos(repos: Repo[], limit: number): Promise<NormalizedRelease[]> {
  const out: NormalizedRelease[] = [];
  const batchSize = 6;
  for (let i = 0; i < repos.length && i < limit; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (repo) => ({ repo, rs: await getReleases(repo.full_name) })),
    );
    for (const { repo, rs } of results) {
      for (const r of rs) out.push(normalize(repo, r));
    }
  }
  out.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return out;
}

async function collectWithCache(key: string, fetcher: () => Promise<NormalizedRelease[]>): Promise<NormalizedRelease[]> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.time < CACHE_TTL) return hit.data;
  const data = await fetcher();
  cache.set(key, { data, time: now });
  // keep cache small
  if (cache.size > 40) {
    for (const k of [...cache.keys()].slice(0, cache.size - 40)) cache.delete(k);
  }
  return data;
}

/** Global search: top repos matching the query + their latest releases. */
function collectGlobal(query: string): Promise<NormalizedRelease[]> {
  const key = `global:${query}`;
  return collectWithCache(key, async () => {
    const repos = await searchRepos(query, GLOBAL_SEARCH_LIMIT * 2);
    return releasesForRepos(repos, GLOBAL_SEARCH_LIMIT);
  });
}

/** A single repo's releases (via ?repo=owner/name). */
function collectRepo(fullName: string): Promise<NormalizedRelease[]> {
  const key = `repo:${fullName}`;
  return collectWithCache(key, async () => {
    const res = await gh(`${GITHUB_API}/repos/${fullName}`);
    if (!res || !res.ok) return [];
    const repo = (await res.json()) as Repo;
    const rs = await getReleases(repo.full_name);
    return rs.map((r) => normalize(repo, r));
  });
}

/** Default feed: ZYRAXON owner repos + a global trending feed. */
function collectDefault(): Promise<NormalizedRelease[]> {
  const key = "default";
  return collectWithCache(key, async () => {
    const [ownerRepos, trendingRepos] = await Promise.all([
      getRepos(DEFAULT_OWNER),
      searchRepos(TRENDING_QUERY, GLOBAL_SEARCH_LIMIT * 2),
    ]);
    // Merge and de-dupe by full_name
    const seen = new Set<string>();
    const merged: Repo[] = [];
    for (const repo of [...ownerRepos, ...trendingRepos]) {
      if (!seen.has(repo.full_name)) {
        seen.add(repo.full_name);
        merged.push(repo);
      }
    }
    const [ownerReleases, trendingReleases] = await Promise.all([
      releasesForRepos(ownerRepos, REPOS_PER_PAGE),
      releasesForRepos(trendingRepos, GLOBAL_SEARCH_LIMIT),
    ]);
    return [...ownerReleases, ...trendingReleases].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  });
}

export const Route = createFileRoute("/api/public/github-releases")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        const repo = (url.searchParams.get("repo") ?? "").trim();
        const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
        const perPage = Math.min(50, Math.max(1, Number(url.searchParams.get("perPage") ?? 20)));

        try {
          let all: NormalizedRelease[] = [];
          if (repo) {
            all = await collectRepo(repo);
          } else if (q) {
            all = await collectGlobal(q);
          } else {
            all = await collectDefault();
          }

          const start = (page - 1) * perPage;
          const items = all.slice(start, start + perPage);

          return Response.json(
            {
              items,
              total: all.length,
              page,
              perPage,
              query: q || null,
              repo: repo || null,
              global: true,
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
