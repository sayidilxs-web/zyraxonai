import { createFileRoute } from "@tanstack/react-router";

/**
 * Read-only proxy for the official Visual Studio Marketplace gallery API.
 *
 *   GET /api/public/vscode-marketplace?q=python&page=1&pageSize=24&sort=installs
 *   GET /api/public/vscode-marketplace?ext=ms-python.python           -> single extension
 *   GET /api/public/vscode-marketplace?ext=ms-python.python&readme=1  -> + rendered README markdown
 *
 * The browser cannot call the gallery API directly (CORS), so everything goes
 * through here. No credentials are involved — the gallery API is public.
 */
const GALLERY = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SORT_BY: Record<string, number> = {
  relevance: 0,
  installs: 4,
  rating: 12,
  trending: 8,
  name: 2,
  updated: 10,
  published: 10,
};

type GalleryFile = { assetType: string; source: string };
type GalleryVersion = {
  version: string;
  lastUpdated: string;
  assetUri?: string;
  fallbackAssetUri?: string;
  files?: GalleryFile[];
  properties?: { key: string; value: string }[];
};
type GalleryExtension = {
  extensionId: string;
  extensionName: string;
  displayName: string;
  shortDescription?: string;
  publishedDate: string;
  lastUpdated: string;
  releaseDate: string;
  flags?: string;
  categories?: string[];
  tags?: string[];
  publisher: { publisherName: string; displayName: string; flags?: string; domain?: string; isDomainVerified?: boolean };
  versions?: GalleryVersion[];
  statistics?: { statisticName: string; value: number }[];
};

function asset(v: GalleryVersion | undefined, type: string): string | null {
  const f = v?.files?.find((x) => x.assetType === type);
  return f?.source ?? null;
}

function prop(v: GalleryVersion | undefined, key: string): string | null {
  return v?.properties?.find((p) => p.key === key)?.value ?? null;
}

function stat(e: GalleryExtension, name: string): number {
  return e.statistics?.find((s) => s.statisticName === name)?.value ?? 0;
}

function normalize(e: GalleryExtension) {
  const v = e.versions?.[0];
  const id = `${e.publisher.publisherName}.${e.extensionName}`;
  return {
    id,
    extensionId: e.extensionId,
    name: e.extensionName,
    displayName: e.displayName,
    description: e.shortDescription ?? "",
    version: v?.version ?? "",
    publisher: {
      name: e.publisher.publisherName,
      displayName: e.publisher.displayName,
      verified: e.publisher.isDomainVerified === true || (e.publisher.flags ?? "").includes("verified"),
      domain: e.publisher.domain ?? null,
    },
    icon: asset(v, "Microsoft.VisualStudio.Services.Icons.Default"),
    installs: stat(e, "install"),
    updateCount: stat(e, "updateCount"),
    rating: stat(e, "averagerating"),
    ratingCount: stat(e, "ratingcount"),
    trendingWeekly: stat(e, "trendingweekly"),
    categories: e.categories ?? [],
    tags: (e.tags ?? []).filter((t) => !t.startsWith("__")),
    lastUpdated: e.lastUpdated,
    publishedDate: e.publishedDate,
    preview: (e.flags ?? "").includes("preview"),
    repository: prop(v, "Microsoft.VisualStudio.Services.Links.Source") ?? prop(v, "Microsoft.VisualStudio.Services.Links.GitHub"),
    homepage: prop(v, "Microsoft.VisualStudio.Services.Links.Learn"),
    license: asset(v, "Microsoft.VisualStudio.Services.Content.License"),
    changelog: asset(v, "Microsoft.VisualStudio.Services.Content.Changelog"),
    readmeUrl: asset(v, "Microsoft.VisualStudio.Services.Content.Details"),
    vsix: asset(v, "Microsoft.VisualStudio.Services.VSIXPackage"),
    marketplaceUrl: `https://marketplace.visualstudio.com/items?itemName=${id}`,
    // Deep-link into the ZYRAXON AI desktop app instead of VS Code.
    installUri: `zyraxon://install/extension/${id}`,
    // Public product page on the ZYRAXON AI website.
    websiteUrl: `https://zyraxonai.lovable.app/ecosystem?item=${encodeURIComponent(id)}`,
    brandingColor: prop(v, "Microsoft.VisualStudio.Services.Branding.Color"),
    brandingTheme: prop(v, "Microsoft.VisualStudio.Services.Branding.Theme"),
  };
}

async function query(body: unknown) {
  const res = await fetch(GALLERY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json;api-version=7.2-preview.1",
      "User-Agent": "zyraxon-ecosystem",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gallery ${res.status}`);
  return (await res.json()) as {
    results: { extensions: GalleryExtension[]; resultMetadata?: { metadataType: string; metadataItems: { name: string; count: number }[] }[] }[];
  };
}

export const Route = createFileRoute("/api/public/vscode-marketplace")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const ext = url.searchParams.get("ext");
        const cache = { ...HEADERS, "Cache-Control": "public, max-age=300" };

        try {
          if (ext) {
            const data = await query({
              filters: [{ criteria: [{ filterType: 8, value: "Microsoft.VisualStudio.Code" }, { filterType: 7, value: ext }], pageNumber: 1, pageSize: 1 }],
              flags: 950,
            });
            const raw = data.results?.[0]?.extensions?.[0];
            if (!raw) return Response.json({ message: "Extension not found" }, { status: 404, headers: HEADERS });
            const item = normalize(raw);

            let readme: string | null = null;
            if (url.searchParams.get("readme") === "1" && item.readmeUrl) {
              const r = await fetch(item.readmeUrl, { headers: { "User-Agent": "zyraxon-ecosystem" } });
              if (r.ok) readme = (await r.text()).slice(0, 400_000);
            }
            return Response.json({ item, readme }, { headers: cache });
          }

          const q = (url.searchParams.get("q") ?? "").trim();
          const category = url.searchParams.get("category");
          const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
          const pageSize = Math.min(54, Math.max(1, Number(url.searchParams.get("pageSize") ?? 24)));
          const sortBy = SORT_BY[url.searchParams.get("sort") ?? "installs"] ?? 4;

          const criteria: { filterType: number; value: string }[] = [
            { filterType: 8, value: "Microsoft.VisualStudio.Code" },
            { filterType: 12, value: "37888" },
          ];
          if (q) criteria.push({ filterType: 10, value: q });
          if (category) criteria.push({ filterType: 5, value: category });

          const data = await query({
            filters: [{ criteria, pageNumber: page, pageSize, sortBy, sortOrder: 0 }],
            flags: 914,
          });

          const result = data.results?.[0];
          const total = result?.resultMetadata?.[0]?.metadataItems?.find((m) => m.name === "TotalCount")?.count ?? 0;
          return Response.json(
            { items: (result?.extensions ?? []).map(normalize), total, page, pageSize },
            { headers: cache },
          );
        } catch (err) {
          return Response.json({ message: `Marketplace request failed`, detail: String(err) }, { status: 502, headers: HEADERS });
        }
      },
    },
  },
});
