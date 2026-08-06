import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-side release resolver for the landing page download buttons.
 * Scans every release (not just /releases/latest) and picks the newest asset
 * that really matches each platform, so a mobile-only release can never make
 * the Windows / macOS / Linux buttons hand out an .apk.
 */
export const REPO = "onelpawarai/ZYRAXON-AI";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=600",
};

// Files that are never a real download
const NOISE = /(\.blockmap$|\.ya?ml$|\.sha\d*$|\.sig$|\.txt$|^latest)/i;

export const PLATFORM_PATTERNS: Record<string, RegExp[]> = {
  windows: [/win.*installer.*\.exe$/i, /setup.*\.exe$/i, /win.*\.exe$/i, /\.exe$/i, /win.*\.msi$/i, /win.*\.zip$/i],
  "mac-arm": [/(mac|osx|darwin).*(arm64|aarch64|silicon).*\.dmg$/i, /-arm64\.dmg$/i, /(mac|osx|darwin).*(arm64|aarch64)\.zip$/i],
  "mac-intel": [/(mac|osx|darwin).*(x64|x86_64|intel).*\.dmg$/i, /-x64\.dmg$/i, /(mac|osx|darwin).*\.dmg$/i, /(mac|osx|darwin).*(x64|x86_64)\.zip$/i],
  linux: [/\.AppImage$/i, /\.deb$/i, /\.rpm$/i, /linux.*(x64|x86_64|amd64).*\.tar\.gz$/i, /linux.*\.tar\.gz$/i],
  android: [/\.apk$/i],
};

export type ResolvedAsset = {
  name: string;
  url: string;
  size: number;
  tag: string;
  releaseUrl: string;
  publishedAt: string | null;
};

type GhAsset = { name: string; browser_download_url: string; size: number };
type GhRelease = {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  assets: GhAsset[];
};

export async function resolveReleases() {
  const token = process.env["GITHUB_PERSONAL_ACCESS_TOKEN"];
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=50`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "zyraxon-website",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const releases = ((await res.json()) as GhRelease[]).filter((r) => !r.draft);

  const platforms: Record<string, ResolvedAsset | null> = {};
  for (const key of Object.keys(PLATFORM_PATTERNS)) {
    platforms[key] = null;
    outer: for (const rel of releases) {
      const assets = (rel.assets || []).filter((a) => !NOISE.test(a.name));
      for (const pattern of PLATFORM_PATTERNS[key]) {
        const hit = assets.find((a) => pattern.test(a.name));
        if (hit) {
          platforms[key] = {
            name: hit.name,
            url: hit.browser_download_url,
            size: hit.size,
            tag: rel.tag_name,
            releaseUrl: rel.html_url,
            publishedAt: rel.published_at,
          };
          break outer;
        }
      }
    }
  }

  const latest = releases[0];
  return {
    latest: latest
      ? { tag: latest.tag_name, name: latest.name || latest.tag_name, url: latest.html_url, publishedAt: latest.published_at }
      : null,
    platforms,
    releasesUrl: `https://github.com/${REPO}/releases`,
  };
}

export const Route = createFileRoute("/api/public/downloads")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),
      GET: async () => {
        try {
          return Response.json(await resolveReleases(), { headers: HEADERS });
        } catch (err) {
          return Response.json(
            { latest: null, platforms: {}, releasesUrl: `https://github.com/${REPO}/releases`, error: String(err) },
            { status: 200, headers: HEADERS },
          );
        }
      },
    },
  },
});
