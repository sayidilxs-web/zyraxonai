import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-side proxy for GitHub releases — GLOBAL, DEEP.
 *
 *   GET /api/public/github-releases?q=chatgpt&depth=15&perRepo=10&page=1&perPage=60
 *   GET /api/public/github-releases?repo=facebook/react&perRepo=100
 *
 * Surfaces releases from the ENTIRE GitHub world (any app, bot, tool,
 * extension — anything with a release). We search repositories across
 * ALL of GitHub (sorted by stars), then pull EVERY release for the top
 * matching repos (paginating through all release pages).
 *
 *   ?q=        search term / category (uses GitHub repo search)
 *   ?repo=     fetch a single repo's full release history
 *   ?depth=    how many repos to pull releases for (default 15, max 40)
 *   ?perRepo=  how many releases per repo (default 10, max 100)
 *   ?page=     pagination into the combined, date-sorted result
 *   ?perPage=  page size (default 60, max 100)
 *
 * Every item includes direct download links for each asset, plus the
 * website deep link, the `zyraxon://install/release/...` deep link, a
 * one-click source-code download (clone) URL, and the git clone URL.
 */
const GITHUB_API = "https://api.github.com";
const DEFAULT_OWNER = "onelpawarai";
const SEARCH_PAGE_SIZE = 100; // repos per search request
const SEARCH_MAX_PAGES = 5; // fetch up to 5 pages = 500 repos
const DEFAULT_DEPTH = 30;
const MAX_DEPTH = 100;
const DEFAULT_PER_REPO = 10;
const MAX_PER_REPO = 100;
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
  defaultBranch: string | null;
  cloneUrl: string;
  sourceZipUrl: string;
  branchZipUrl: string;
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

// Simple in-memory cache (keyed by query + depth + perRepo) to avoid hammering the GitHub API.
const cache = new Map<string, { data: NormalizedRelease[]; time: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function gh(url: string): Promise<Response | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "zyraxon-ecosystem",
    };
    // Optional server-side token (from env) — raises rate limits when present.
    const ghToken = process.env["GITHUB_PERSONAL_ACCESS_TOKEN"] || process.env.GITHUB_TOKEN;
    if (ghToken) headers.Authorization = `Bearer ${ghToken}`;
    return await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  } catch {
    return null;
  }
}

/** Search repositories across ALL of GitHub (sorted by stars) — paginating multiple pages. */
async function searchRepos(query: string, maxPages: number = SEARCH_MAX_PAGES): Promise<Repo[]> {
  const all: Repo[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await gh(
      `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${SEARCH_PAGE_SIZE}&page=${page}`,
    );
    if (!res || !res.ok) break;
    const data = (await res.json()) as { items?: Repo[] };
    const items = data.items ?? [];
    if (!items.length) break;
    all.push(...items);
    if (items.length < SEARCH_PAGE_SIZE) break;
  }
  return all;
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
      return data.filter((r) => !r.full_name.toLowerCase().endsWith(".github")).slice(0, SEARCH_PAGE_SIZE);
    }
  }
  return [];
}

/**
 * Fetch a repo's releases — paginating through ALL release pages so we
 * return the complete release history (capped at `perRepo`).
 */
async function getReleases(fullName: string, perRepo: number): Promise<Release[]> {
  const out: Release[] = [];
  let page = 1;
  const PAGE = 100;
  while (out.length < perRepo) {
    const res = await gh(`${GITHUB_API}/repos/${fullName}/releases?per_page=${PAGE}&page=${page}`);
    if (!res || !res.ok) break;
    const batch = (await res.json()) as Release[];
    if (!batch.length) break;
    out.push(...batch);
    if (batch.length < PAGE) break; // no more pages
    page += 1;
    if (page > 20) break; // safety
  }
  return out.slice(0, perRepo);
}

function normalize(repo: Repo, r: Release): NormalizedRelease {
  const firstAsset = r.assets[0] ?? null;
  const full = repo.full_name;
  const branch = repo.default_branch || "main";
  return {
    id: r.id,
    repo: repo.name,
    repoFullName: full,
    repoUrl: repo.html_url,
    repoDescription: repo.description,
    owner: repo.owner?.login ?? "",
    ownerAvatar: repo.owner?.avatar_url ?? null,
    stars: repo.stargazers_count ?? 0,
    language: repo.language ?? null,
    defaultBranch: branch,
    cloneUrl: `https://github.com/${full}.git`,
    sourceZipUrl: `https://github.com/${full}/archive/refs/tags/${encodeURIComponent(r.tag_name)}.zip`,
    branchZipUrl: `https://github.com/${full}/archive/refs/heads/${encodeURIComponent(branch)}.zip`,
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
    zyraxonUrl: `zyraxon://install/release/${encodeURIComponent(full)}/${encodeURIComponent(r.tag_name)}`,
  };
}

/** Concurrency-safe batch fetch for releases across many repos. */
async function releasesForRepos(repos: Repo[], depth: number, perRepo: number): Promise<NormalizedRelease[]> {
  const out: NormalizedRelease[] = [];
  const batchSize = 5;
  for (let i = 0; i < repos.length && i < depth; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (repo) => ({ repo, rs: await getReleases(repo.full_name, perRepo) })),
    );
    for (const { repo, rs } of results) {
      for (const r of rs) out.push(normalize(repo, r));
    }
  }
  out.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return out;
}

async function collectWithCache(
  key: string,
  fetcher: () => Promise<NormalizedRelease[]>,
): Promise<NormalizedRelease[]> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.time < CACHE_TTL) return hit.data;
  const data = await fetcher();
  cache.set(key, { data, time: now });
  // keep cache small
  if (cache.size > 60) {
    for (const k of [...cache.keys()].slice(0, cache.size - 60)) cache.delete(k);
  }
  return data;
}

/** Global search: top repos matching the query + ALL their releases. */
function collectGlobal(query: string, depth: number, perRepo: number): Promise<NormalizedRelease[]> {
  const key = `global:${query}:${depth}:${perRepo}`;
  return collectWithCache(key, async () => {
    const repos = await searchRepos(query);
    return releasesForRepos(repos, depth, perRepo);
  });
}

/** A single repo's full release history (via ?repo=owner/name). */
function collectRepo(fullName: string, perRepo: number): Promise<NormalizedRelease[]> {
  const key = `repo:${fullName}:${perRepo}`;
  return collectWithCache(key, async () => {
    const res = await gh(`${GITHUB_API}/repos/${fullName}`);
    if (!res || !res.ok) return [];
    const repo = (await res.json()) as Repo;
    const rs = await getReleases(repo.full_name, perRepo);
    return rs.map((r) => normalize(repo, r));
  });
}

/** Default feed: ZYRAXON owner repos + a global trending feed. */
function collectDefault(depth: number, perRepo: number): Promise<NormalizedRelease[]> {
  const key = `default:${depth}:${perRepo}`;
  return collectWithCache(key, async () => {
    const [ownerRepos, trendingRepos] = await Promise.all([
      getRepos(DEFAULT_OWNER),
      searchRepos(TRENDING_QUERY),
    ]);
    const [ownerReleases, trendingReleases] = await Promise.all([
      releasesForRepos(ownerRepos, REPOS_PER_PAGE(depth), perRepo),
      releasesForRepos(trendingRepos, depth, perRepo),
    ]);
    return [...ownerReleases, ...trendingReleases].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  });
}

function REPOS_PER_PAGE(depth: number): number {
  return Math.min(depth, 24);
}

export const Route = createFileRoute("/api/public/github-releases")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        const repo = (url.searchParams.get("repo") ?? "").trim();
        const depth = Math.min(MAX_DEPTH, Math.max(1, Number(url.searchParams.get("depth") ?? DEFAULT_DEPTH)));
        const perRepo = Math.min(MAX_PER_REPO, Math.max(1, Number(url.searchParams.get("perRepo") ?? DEFAULT_PER_REPO)));
        const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
        const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? 60)));

        try {
          let all: NormalizedRelease[] = [];
          if (repo) {
            all = await collectRepo(repo, perRepo);
          } else if (q) {
            all = await collectGlobal(q, depth, perRepo);
          } else {
            all = await collectDefault(depth, perRepo);
          }

          const start = (page - 1) * perPage;
          const items = all.slice(start, start + perPage);

          return Response.json(
            {
              items,
              total: all.length,
              page,
              perPage,
              depth,
              perRepo,
              query: q || null,
              repo: repo || null,
              global: true,
              hasMore: start + items.length < all.length,
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
