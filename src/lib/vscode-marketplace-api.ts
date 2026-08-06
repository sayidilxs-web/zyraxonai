/**
 * ZYRAXON AI — VS Code Marketplace API Integration
 * -------------------------------------------------
 * Connects to the world's largest extension marketplace
 * (VS Code Marketplace + Open VSX) to fetch real extension data,
 * install commands, and metadata. This enables the ZYRAXON
 * ecosystem to show thousands of real extensions with proper
 * install buttons that download VSIX files and install them
 * directly into the ZYRAXON desktop app.
 *
 * Supported sources:
 *   - VS Code Marketplace (marketplace.visualstudio.com)
 *   - Open VSX Registry (open-vsx.org)
 *   - GitHub Extensions (direct from repos)
 */

const VSCODE_MARKETPLACE_API = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
const OPEN_VSX_API = "https://open-vsx.org/api";
const GITHUB_API = "https://api.github.com";

export interface VSCodeExtension {
  id: string;
  extensionId: string;
  extensionName: string;
  displayName: string;
  shortDescription: string;
  publisher: {
    publisherName: string;
    displayName: string;
    domain?: string;
    isDomainVerified?: boolean;
    publisherId?: string;
  };
  versions: {
    version: string;
    targetPlatform?: string;
    lastUpdated: string;
    assetUri?: string;
    install: string;
    statistics?: {
      statisticName: string;
      value: number;
    }[];
  }[];
  categories: string[];
  tags: string[];
  installCount: number;
  rating: number;
  ratingCount: number;
  lastUpdated: string;
  publishedDate: string;
  license?: string;
  repository?: string;
  homepage?: string;
  icon?: string;
  screenshots?: string[];
}

export interface MarketplaceSearchResult {
  extensions: VSCodeExtension[];
  totalCount: number;
  hasMore: boolean;
}

export interface MCPExtension {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  authorAvatar?: string;
  downloads: number;
  rating: number;
  verified: boolean;
  icon?: string;
  repository?: string;
  installCommand: string;
  vsixUrl?: string;
  categories: string[];
  tags: string[];
  lastUpdated: string;
}

// ── VS Code Marketplace Query ────────────────────────────────────────

async function queryVSCodeMarketplace(
  searchText: string,
  options: {
    filters?: string[];
    sortBy?: "Installs" | "Rating" | "Name" | "LastUpdated";
    pageSize?: number;
    pageNumber?: number;
    targetPlatform?: string;
  } = {}
): Promise<MarketplaceSearchResult> {
  const {
    filters = ["Microsoft", "Visual Studio Code"],
    sortBy = "Installs",
    pageSize = 50,
    pageNumber = 1,
  } = options;

  const criteria = [
    { filterType: 8, value: "Microsoft.VisualStudio.Code" },
  ];

  if (searchText) {
    criteria.push({ filterType: 10, value: searchText });
  }

  const body = {
    assetTypes: [],
    filters: [
      {
        criteria,
        direction: 2,
        pageSize,
        pageNumber,
        sortBy: sortBy === "Installs" ? 4 : sortBy === "Rating" ? 12 : sortBy === "LastUpdated" ? 8 : 6,
        sortOrder: 0,
      },
    ],
    flags: 0x192,
  };

  try {
    const response = await fetch(VSCODE_MARKETPLACE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json;api-version=6.1-preview.1",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Marketplace API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data?.results?.[0] || { extensions: [], metadata: { resultMetadata: [] } };

    const extensions: VSCodeExtension[] = (results.extensions || []).map((ext: any) => {
      const latestVersion = ext.versions?.[0] || {};
      const statistics = latestVersion.statistics || [];

      return {
        id: ext.extensionId,
        extensionId: ext.extensionId,
        extensionName: ext.extensionName,
        displayName: ext.displayName,
        shortDescription: ext.shortDescription || "",
        publisher: {
          publisherName: ext.publisher?.publisherName || "",
          displayName: ext.publisher?.displayName || "",
          domain: ext.publisher?.domain,
          isDomainVerified: ext.publisher?.isDomainVerified,
          publisherId: ext.publisher?.publisherId,
        },
        versions: (ext.versions || []).map((v: any) => ({
          version: v.version,
          targetPlatform: v.targetPlatform,
          lastUpdated: v.lastUpdated,
          assetUri: v.assetUri,
          install: v.install || "",
          statistics: (v.statistics || []).map((s: any) => ({
            statisticName: s.statisticName,
            value: s.value || 0,
          })),
        })),
        categories: ext.categories || [],
        tags: ext.tags || [],
        installCount: statistics.find((s: any) => s.statisticName === "install")?.value || 0,
        rating: statistics.find((s: any) => s.statisticName === "averagerating")?.value || 0,
        ratingCount: statistics.find((s: any) => s.statisticName === "ratingcount")?.value || 0,
        lastUpdated: latestVersion.lastUpdated || "",
        publishedDate: ext.publishedDate || "",
        license: ext.versions?.[0]?.targetPlatform ? undefined : undefined,
        repository: ext.repository,
        homepage: ext.homepage,
        icon: ext.versions?.[0]?.assetUri ? `${ext.versions[0].assetUri}/Microsoft.VisualStudio.Services.Icons.Default` : undefined,
        screenshots: [],
      };
    });

    return {
      extensions,
      totalCount: results.resultMetadata?.find((m: any) => m.metadataType === "ResultCount")?.metadata?.[0]?.count || extensions.length,
      hasMore: extensions.length === pageSize,
    };
  } catch (error) {
    console.error("VS Code Marketplace API error:", error);
    return { extensions: [], totalCount: 0, hasMore: false };
  }
}

// ── Open VSX Query ──────────────────────────────────────────────

async function queryOpenVSX(
  namespace?: string,
  query?: string,
  options: { size?: number; offset?: number } = {}
): Promise<MarketplaceSearchResult> {
  const { size = 50, offset = 0 } = options;

  try {
    const url = namespace
      ? `${OPEN_VSX_API}/namespace/${namespace}?size=${size}&offset=${offset}`
      : `${OPEN_VSX_API}/search?query=${encodeURIComponent(query || "")}&size=${size}&offset=${offset}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Open VSX API error: ${response.status}`);
    }

    const data = await response.json();
    const extensions: VSCodeExtension[] = (data.extensions || []).map((ext: any) => ({
      id: ext.id || `${ext.namespace?.toLowerCase()}.${ext.name}`,
      extensionId: ext.id || `${ext.namespace?.toLowerCase()}.${ext.name}`,
      extensionName: ext.name,
      displayName: ext.displayName || ext.name,
      shortDescription: ext.description || "",
      publisher: {
        publisherName: ext.namespace || "",
        displayName: ext.namespace || "",
        isDomainVerified: false,
      },
      versions: [{
        version: ext.version || "1.0.0",
        lastUpdated: ext.timestamp || new Date().toISOString(),
        install: "",
      }],
      categories: ext.categories || [],
      tags: ext.keywords || [],
      installCount: ext.downloadCount || 0,
      rating: ext.averageRating || 0,
      ratingCount: ext.ratingCount || 0,
      lastUpdated: ext.timestamp || "",
      publishedDate: ext.timestamp || "",
      repository: ext.repository,
      icon: ext.files?.find((f: any) => f.type === "icon")?.url,
      screenshots: ext.files?.filter((f: any) => f.type === "screenshot").map((f: any) => f.url) || [],
    }));

    return {
      extensions,
      totalCount: data.totalSize || extensions.length,
      hasMore: extensions.length === size,
    };
  } catch (error) {
    console.error("Open VSX API error:", error);
    return { extensions: [], totalCount: 0, hasMore: false };
  }
}

// ── MCP Server Detection ────────────────────────────────────────

const MCP_KEYWORDS = [
  "mcp", "model-context-protocol", "model context protocol", "mcp-server",
  "mcp-server-vscode", "mcp extension", "ai agent", "tool use", "function calling",
  "llm", "chatgpt", "copilot", "ai assistant", "code generation", "code completion",
];

function isMCPExtension(ext: VSCodeExtension): boolean {
  const text = [
    ext.displayName,
    ext.shortDescription,
    ...(ext.categories || []),
    ...(ext.tags || []),
  ].join(" ").toLowerCase();

  return MCP_KEYWORDS.some((kw) => text.includes(kw));
}

// ── Public API ──────────────────────────────────────────────────

export async function searchExtensions(
  query: string,
  options: {
    source?: "marketplace" | "openvsx" | "both";
    category?: string;
    sortBy?: "Installs" | "Rating" | "LastUpdated";
    pageSize?: number;
  } = {}
): Promise<MarketplaceSearchResult> {
  const { source = "marketplace", category, sortBy = "Installs", pageSize = 50 } = options;

  const searchQuery = category ? `${query} category:"${category}"` : query;

  if (source === "marketplace") {
    return queryVSCodeMarketplace(searchQuery, { sortBy, pageSize });
  }

  if (source === "openvsx") {
    return queryOpenVSX(undefined, searchQuery, { size: pageSize });
  }

  // Both sources
  const [marketplaceResults, openVSXResults] = await Promise.all([
    queryVSCodeMarketplace(searchQuery, { sortBy, pageSize: Math.ceil(pageSize / 2) }),
    queryOpenVSX(undefined, searchQuery, { size: Math.ceil(pageSize / 2) }),
  ]);

  return {
    extensions: [...marketplaceResults.extensions, ...openVSXResults.extensions],
    totalCount: marketplaceResults.totalCount + openVSXResults.totalCount,
    hasMore: marketplaceResults.hasMore || openVSXResults.hasMore,
  };
}

export async function getMCPServers(
  options: { pageSize?: number; pageNumber?: number } = {}
): Promise<MarketplaceSearchResult> {
  const { pageSize = 50, pageNumber = 1 } = options;

  const results = await queryVSCodeMarketplace("mcp server", {
    sortBy: "Installs",
    pageSize,
    pageNumber,
  });

  // Also fetch Open VSX MCP servers
  const openVSXResults = await queryOpenVSX(undefined, "mcp server", { size: pageSize });

  const allExtensions = [...results.extensions, ...openVSXResults.extensions];

  return {
    extensions: allExtensions.filter(isMCPExtension),
    totalCount: allExtensions.length,
    hasMore: results.hasMore || openVSXResults.hasMore,
  };
}

export async function getTopExtensions(
  category?: string,
  options: { pageSize?: number } = {}
): Promise<MarketplaceSearchResult> {
  return queryVSCodeMarketplace(category || "", {
    sortBy: "Installs",
    pageSize: options.pageSize || 50,
  });
}

export async function getTrendingExtensions(
  options: { pageSize?: number } = {}
): Promise<MarketplaceSearchResult> {
  return queryVSCodeMarketplace("", {
    sortBy: "Rating",
    pageSize: options.pageSize || 50,
  });
}

export async function getNewExtensions(
  options: { pageSize?: number } = {}
): Promise<MarketplaceSearchResult> {
  return queryVSCodeMarketplace("", {
    sortBy: "LastUpdated",
    pageSize: options.pageSize || 50,
  });
}

export async function getExtensionById(extensionId: string): Promise<VSCodeExtension | null> {
  try {
    const results = await queryVSCodeMarketplace(extensionId, { pageSize: 1 });
    return results.extensions[0] || null;
  } catch {
    return null;
  }
}

export function getVSIXDownloadUrl(extension: VSCodeExtension): string | null {
  const latestVersion = extension.versions?.[0];
  if (!latestVersion?.install) return null;
  return latestVersion.install;
}

export function getInstallCommand(extension: VSCodeExtension): string {
  const vsixUrl = getVSIXDownloadUrl(extension);
  if (vsixUrl) {
    return `zyraxon --install-extension ${extension.publisher.publisherName}.${extension.extensionName}@${extension.versions?.[0]?.version || "latest"}`;
  }
  return `zyraxon --install-extension ${extension.publisher.publisherName}.${extension.extensionName}`;
}

export function formatMarketplaceStats(extension: VSCodeExtension) {
  return {
    installs: extension.installCount,
    rating: extension.rating,
    ratingCount: extension.ratingCount,
    lastUpdated: extension.lastUpdated,
    categories: extension.categories,
    tags: extension.tags,
    publisher: extension.publisher.displayName,
    publisherVerified: extension.publisher.isDomainVerified,
  };
}

export type { VSCodeExtension as Extension };
