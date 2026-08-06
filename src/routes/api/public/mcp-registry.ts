import { createFileRoute } from "@tanstack/react-router";

/**
 * ZYRAXON AI — native catalog (MCP tools, agent modes, prompt packs).
 *
 *   GET /api/public/mcp-registry
 *   GET /api/public/mcp-registry?kind=mcp&q=github&page=1&pageSize=24
 *   GET /api/public/mcp-registry?id=zyraxon.mcp-github
 *
 * Items are returned in the exact same shape the extension gallery
 * uses, so the marketplace UI renders them with one code path.
 */

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

type Kind = "mcp" | "agent-mode" | "prompt-pack";

interface CatalogEntry {
  id: string;
  kind: Kind;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  publisherDisplay: string;
  verified: boolean;
  installs: number;
  rating: number;
  ratingCount: number;
  categories: string[];
  tags: string[];
  capabilities: string[];
  repository: string | null;
  homepage: string | null;
  license: string | null;
  lastUpdated: string;
  color: string;
  readme: string;
}

const NOW = "2026-07-20T00:00:00.000Z";

const MCP_TOOLS: CatalogEntry[] = [
  {
    id: "zyraxon.mcp-github", kind: "mcp", displayName: "GitHub MCP", version: "1.4.0",
    description: "Read repos, issues, pull requests and code search directly from any ZYRAXON agent mode.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 184_300, rating: 4.8, ratingCount: 1240,
    categories: ["MCP Tools", "Developer"], tags: ["github", "git", "repos", "issues"],
    capabilities: ["Network access", "Credential storage", "Sends context to an AI model"],
    repository: "https://github.com/github/github-mcp-server", homepage: "https://github.com", license: "MIT",
    lastUpdated: NOW, color: "#58a6ff",
    readme: "# GitHub MCP\n\nGives ZYRAXON agents first-class access to GitHub.\n\n## Tools\n- `search_repositories`\n- `get_file_contents`\n- `create_issue`, `create_pull_request`\n- `list_commits`, `get_diff`\n\n## Setup\nAuthorize with a fine-grained personal access token when prompted. The token never leaves your machine.",
  },
  {
    id: "zyraxon.mcp-filesystem", kind: "mcp", displayName: "Filesystem MCP", version: "1.2.3",
    description: "Sandboxed read/write access to the folders you explicitly allow. Every path is scoped and audited.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 221_900, rating: 4.7, ratingCount: 980,
    categories: ["MCP Tools", "Core"], tags: ["files", "workspace", "fs"],
    capabilities: ["Workspace file access"],
    repository: "https://github.com/modelcontextprotocol/servers", homepage: null, license: "MIT",
    lastUpdated: NOW, color: "#3fb950",
    readme: "# Filesystem MCP\n\nScoped filesystem access for agents.\n\n## Tools\n- `read_file`, `write_file`\n- `list_directory`, `search_files`\n- `move_file`, `create_directory`\n\nOnly the directories you allow-list are reachable.",
  },
  {
    id: "zyraxon.mcp-postgres", kind: "mcp", displayName: "PostgreSQL MCP", version: "1.1.0",
    description: "Query, inspect and migrate PostgreSQL databases with read-only guards enabled by default.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 96_400, rating: 4.6, ratingCount: 512,
    categories: ["MCP Tools", "Data"], tags: ["sql", "database", "postgres"],
    capabilities: ["Network access", "Credential storage"],
    repository: "https://github.com/modelcontextprotocol/servers", homepage: null, license: "MIT",
    lastUpdated: NOW, color: "#38bdf8",
    readme: "# PostgreSQL MCP\n\nSafe database access.\n\n## Tools\n- `query` (read-only by default)\n- `list_tables`, `describe_table`\n- `explain`\n\nWrite access requires an explicit opt-in per connection.",
  },
  {
    id: "zyraxon.mcp-browser", kind: "mcp", displayName: "Browser Automation MCP", version: "2.0.1",
    description: "Drive a real Chromium instance — navigate, click, screenshot, scrape — straight from an agent turn.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 143_700, rating: 4.5, ratingCount: 744,
    categories: ["MCP Tools", "Automation"], tags: ["browser", "playwright", "scraping", "automation"],
    capabilities: ["Network access", "Terminal / process execution"],
    repository: "https://github.com/microsoft/playwright-mcp", homepage: null, license: "Apache-2.0",
    lastUpdated: NOW, color: "#e3b341",
    readme: "# Browser Automation MCP\n\nHeadless or headed Chromium control.\n\n## Tools\n- `navigate`, `click`, `type`\n- `screenshot`, `snapshot`\n- `evaluate`\n\nRuns locally; no page content is uploaded anywhere.",
  },
  {
    id: "zyraxon.mcp-memory", kind: "mcp", displayName: "Unlimited Memory MCP", version: "3.1.0",
    description: "Persistent long-term memory graph for agents — entities, relations and recall across every session.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 167_200, rating: 4.9, ratingCount: 1105,
    categories: ["MCP Tools", "Core"], tags: ["memory", "rag", "knowledge", "graph"],
    capabilities: ["Workspace file access", "Sends context to an AI model"],
    repository: "https://github.com/modelcontextprotocol/servers", homepage: null, license: "MIT",
    lastUpdated: NOW, color: "#8957e5",
    readme: "# Unlimited Memory MCP\n\nThe memory layer behind ZYRAXON's unlimited-context mode.\n\n## Tools\n- `remember`, `recall`, `forget`\n- `create_entities`, `create_relations`\n- `search_nodes`\n\nStored locally in an embedded graph database.",
  },
  {
    id: "zyraxon.mcp-web-search", kind: "mcp", displayName: "Web Search MCP", version: "1.6.2",
    description: "Live web search and page fetching with citation-ready results for grounded answers.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 208_500, rating: 4.7, ratingCount: 1320,
    categories: ["MCP Tools", "Research"], tags: ["search", "web", "research", "citations"],
    capabilities: ["Network access"],
    repository: null, homepage: null, license: "MIT",
    lastUpdated: NOW, color: "#f778ba",
    readme: "# Web Search MCP\n\nGrounded search for every agent mode.\n\n## Tools\n- `search`\n- `fetch_page`\n- `extract_readable`\n\nResults come back with source URLs so answers stay citable.",
  },
  {
    id: "zyraxon.mcp-docker", kind: "mcp", displayName: "Docker MCP", version: "1.0.4",
    description: "Build, run and inspect containers. Ideal for reproducible agent-run test environments.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 61_800, rating: 4.4, ratingCount: 310,
    categories: ["MCP Tools", "DevOps"], tags: ["docker", "containers", "devops"],
    capabilities: ["Terminal / process execution", "Network access"],
    repository: null, homepage: null, license: "Apache-2.0",
    lastUpdated: NOW, color: "#2496ed",
    readme: "# Docker MCP\n\nContainer lifecycle control.\n\n## Tools\n- `build_image`, `run_container`\n- `list_containers`, `logs`\n- `exec`\n\nRequires a local Docker daemon.",
  },
  {
    id: "zyraxon.mcp-vision", kind: "mcp", displayName: "Screen Vision MCP", version: "2.2.0",
    description: "Screenshot understanding, OCR and UI element grounding — the eyes behind ZYRAXON Vision mode.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 88_100, rating: 4.6, ratingCount: 402,
    categories: ["MCP Tools", "Vision"], tags: ["vision", "ocr", "screenshot", "ui"],
    capabilities: ["Sends context to an AI model", "Clipboard access"],
    repository: null, homepage: null, license: "BSL-1.1",
    lastUpdated: NOW, color: "#7ee787",
    readme: "# Screen Vision MCP\n\nGives agents sight.\n\n## Tools\n- `capture_screen`\n- `ocr`\n- `locate_element`\n\nImages are processed on-device where the model supports it.",
  },
];

const AGENT_MODES: CatalogEntry[] = ([
  ["build", "Build Mode", "Ships features end-to-end: plans, writes, runs and verifies code in one continuous loop.", "#58a6ff"],
  ["plan", "Plan Mode", "Read-only architect. Explores the codebase and returns a reviewable implementation plan.", "#8b949e"],
  ["beast", "Beast Mode", "Maximum-throughput execution across large multi-file refactors without pausing for confirmation.", "#f85149"],
  ["pro", "PRO Mode", "Balanced daily driver — deep reasoning with cost-aware tool usage.", "#3fb950"],
  ["apex-predator", "APEX PREDATOR", "Relentless bug hunter. Reproduces, isolates and eliminates defects with adversarial testing.", "#d29922"],
  ["dark-emperor", "DARK EMPEROR", "Full-autonomy long-horizon mode with self-healing and self-evolution enabled.", "#a371f7"],
  ["vision", "Vision Mode", "Screenshot-driven development — turns UI captures into working interfaces.", "#7ee787"],
  ["pro-builder", "Pro Builder", "Product-grade scaffolding with design systems, tests and CI wired from the first commit.", "#f778ba"],
  ["general", "General Mode", "Conversational assistant for research, explanation and everyday questions.", "#58a6ff"],
] as const).map(([slug, name, desc, color], i) => ({
  id: `zyraxon.mode-${slug}`,
  kind: "agent-mode" as Kind,
  displayName: name,
  description: desc,
  version: "4.0.0",
  publisher: "zyraxon",
  publisherDisplay: "ZYRAXON AI",
  verified: true,
  installs: 120_000 - i * 7_400,
  rating: 4.9 - i * 0.03,
  ratingCount: 900 - i * 40,
  categories: ["Agent Modes"],
  tags: ["mode", "agent", slug],
  capabilities: ["Sends context to an AI model", "Workspace file access"],
  repository: "https://github.com/PsychoCoderX/ZYRAXON-AI",
  homepage: "https://zyraxonai.lovable.app",
  license: "BSL-1.1",
  lastUpdated: NOW,
  color,
  readme: `# ${name}\n\n${desc}\n\n## Built for\nZYRAXON AI 4.x with 136+ MCP tools.\n\n## Activation\nInstall, then pick **${name}** from the mode switcher in the app.`,
}));

const PROMPT_PACKS: CatalogEntry[] = [
  {
    id: "zyraxon.pack-fullstack", kind: "prompt-pack", displayName: "Full-Stack Engineering Pack", version: "2.1.0",
    description: "42 battle-tested prompts for API design, schema modelling, refactors and code review.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 54_200, rating: 4.7, ratingCount: 288,
    categories: ["Prompt Packs", "Developer"], tags: ["prompts", "fullstack", "review"],
    capabilities: [], repository: null, homepage: null, license: "MIT",
    lastUpdated: NOW, color: "#58a6ff",
    readme: "# Full-Stack Engineering Pack\n\n42 prompts covering API design, database modelling, refactoring, testing and code review.",
  },
  {
    id: "zyraxon.pack-security", kind: "prompt-pack", displayName: "Security Audit Pack", version: "1.3.0",
    description: "Threat modelling, dependency triage and OWASP-aligned review prompts for hardened releases.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 31_700, rating: 4.8, ratingCount: 176,
    categories: ["Prompt Packs", "Security"], tags: ["security", "owasp", "audit"],
    capabilities: [], repository: null, homepage: null, license: "MIT",
    lastUpdated: NOW, color: "#f85149",
    readme: "# Security Audit Pack\n\nStructured prompts for threat modelling, dependency triage, secret scanning and OWASP Top 10 review.",
  },
  {
    id: "zyraxon.pack-automation", kind: "prompt-pack", displayName: "Workflow Automation Pack", version: "1.0.6",
    description: "Chain MCP tools into repeatable automations — scraping, reporting, deploys and daily digests.",
    publisher: "zyraxon", publisherDisplay: "ZYRAXON AI", verified: true,
    installs: 27_400, rating: 4.5, ratingCount: 132,
    categories: ["Prompt Packs", "Automation"], tags: ["automation", "workflow", "mcp"],
    capabilities: ["Network access"], repository: null, homepage: null, license: "MIT",
    lastUpdated: NOW, color: "#d29922",
    readme: "# Workflow Automation Pack\n\nReady-made agent workflows that chain multiple MCP tools into one command.",
  },
];

const CATALOG: CatalogEntry[] = [...MCP_TOOLS, ...AGENT_MODES, ...PROMPT_PACKS];

function toItem(e: CatalogEntry) {
  return {
    id: e.id,
    kind: e.kind,
    name: e.id.split(".")[1] ?? e.id,
    displayName: e.displayName,
    description: e.description,
    version: e.version,
    publisher: { name: e.publisher, displayName: e.publisherDisplay, verified: e.verified, domain: null },
    icon: null,
    installs: e.installs,
    updateCount: 0,
    rating: Number(e.rating.toFixed(2)),
    ratingCount: e.ratingCount,
    trendingWeekly: 0,
    categories: e.categories,
    tags: e.tags,
    capabilities: e.capabilities,
    lastUpdated: e.lastUpdated,
    publishedDate: e.lastUpdated,
    preview: false,
    repository: e.repository,
    homepage: e.homepage,
    license: e.license,
    changelog: null,
    readmeUrl: null,
    vsix: null,
    marketplaceUrl: `https://zyraxonai.lovable.app/ecosystem?item=${encodeURIComponent(e.id)}`,
    installUri: `zyraxon://install/${e.kind}/${e.id}`,
    websiteUrl: `https://zyraxonai.lovable.app/ecosystem?item=${encodeURIComponent(e.id)}`,
    brandingColor: e.color,
  };
}

export const Route = createFileRoute("/api/public/mcp-registry")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (id) {
          const entry = CATALOG.find((e) => e.id === id);
          if (!entry) {
            return new Response(JSON.stringify({ message: "Not found" }), { status: 404, headers: HEADERS });
          }
          return new Response(JSON.stringify({ item: toItem(entry), readme: entry.readme }), { headers: HEADERS });
        }

        const kind = url.searchParams.get("kind");
        const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
        const category = url.searchParams.get("category");
        const sort = url.searchParams.get("sort") ?? "installs";
        const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
        const pageSize = Math.min(60, Math.max(1, Number(url.searchParams.get("pageSize") ?? 24) || 24));

        let list = CATALOG.slice();
        if (kind && kind !== "all") list = list.filter((e) => e.kind === kind);
        if (category && category !== "All") list = list.filter((e) => e.categories.includes(category));
        if (q) {
          list = list.filter((e) =>
            e.displayName.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.tags.some((t) => t.toLowerCase().includes(q)));
        }

        list.sort((a, b) => {
          if (sort === "rating") return b.rating - a.rating;
          if (sort === "name") return a.displayName.localeCompare(b.displayName);
          if (sort === "updated") return Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
          return b.installs - a.installs;
        });

        const total = list.length;
        const items = list.slice((page - 1) * pageSize, page * pageSize).map(toItem);
        return new Response(JSON.stringify({ items, total, page, pageSize }), { headers: HEADERS });
      },
    },
  },
});
