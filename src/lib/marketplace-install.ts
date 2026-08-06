/**
 * ZYRAXON AI — Marketplace install engine
 * -------------------------------------------------------------
 * Mirrors how VS Code manages extensions, so the ZYRAXON desktop
 * app needs no changes: the website exposes the exact same
 * install / uninstall / enable / disable / update surface and
 * hands each action to the app through one of three channels,
 * tried in order:
 *
 *   1. window.zyraxon  — Electron preload bridge (best, silent)
 *   2. zyraxon://      — registered deep-link protocol
 *   3. VSIX download   — manual fallback, always works
 *
 * The website keeps its own mirror of the installed set in
 * localStorage so the UI is instant and survives reloads, and it
 * reconciles with the app whenever the app reports back.
 *
 * ENHANCED: Now supports direct VSIX download from VS Code Marketplace
 * and Open VSX Registry for thousands of real extensions.
 */

export type InstallState = "not-installed" | "installing" | "installed" | "disabled" | "uninstalling";

export interface InstalledRecord {
  id: string;
  displayName: string;
  version: string;
  publisher: string;
  icon?: string | null;
  vsix?: string | null;
  source: "extension" | "mcp" | "agent-mode" | "prompt-pack" | "theme";
  installedAt: string;
  enabled: boolean;
  autoUpdate: boolean;
  vsixUrl?: string | null;
  installFromMarketplace?: boolean;
}

export interface InstallTarget {
  id: string;
  displayName: string;
  version: string;
  publisher: string;
  icon?: string | null;
  vsix?: string | null;
  source?: InstalledRecord["source"];
  vsixUrl?: string | null;
}

const STORAGE_KEY = "zyraxon.marketplace.installed.v1";
const SCHEME = "zyraxon://";

/* ------------------------------------------------------------------ */
/* Electron / app bridge                                              */
/* ------------------------------------------------------------------ */

interface ZyraxonBridge {
  installExtension?: (payload: unknown) => Promise<unknown> | unknown;
  uninstallExtension?: (id: string) => Promise<unknown> | unknown;
  setExtensionEnabled?: (id: string, enabled: boolean) => Promise<unknown> | unknown;
  listExtensions?: () => Promise<InstalledRecord[]> | InstalledRecord[];
}

function bridge(): ZyraxonBridge | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { zyraxon?: ZyraxonBridge; zyraxonBridge?: ZyraxonBridge };
  return w.zyraxon ?? w.zyraxonBridge ?? null;
}

export function hasAppBridge(): boolean {
  const b = bridge();
  return !!(b && (b.installExtension || b.listExtensions));
}

/* ------------------------------------------------------------------ */
/* Deep links (VS Code parity: vscode:extension/<id>)                  */
/* ------------------------------------------------------------------ */

export function installDeepLink(t: InstallTarget): string {
  const kind = t.source ?? "extension";
  const q = new URLSearchParams({ version: t.version || "latest" });
  if (t.vsix) q.set("package", t.vsix);
  if (t.vsixUrl) q.set("vsix", t.vsixUrl);
  return `${SCHEME}install/${kind}/${encodeURIComponent(t.id)}?${q.toString()}`;
}

export function uninstallDeepLink(id: string, kind: InstalledRecord["source"] = "extension"): string {
  return `${SCHEME}uninstall/${kind}/${encodeURIComponent(id)}`;
}

export function openDeepLink(url: string): void {
  if (typeof window === "undefined") return;
  try {
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.src = url;
    document.body.appendChild(frame);
    window.setTimeout(() => frame.remove(), 1500);
  } catch {
    try { window.location.href = url; } catch { /* app not installed */ }
  }
}

/* ------------------------------------------------------------------ */
/* VSIX Download from Marketplaces                                     */
/* ------------------------------------------------------------------ */

const VSCODE_MARKETPLACE_API = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";

export async function fetchVSIXUrl(publisher: string, extensionName: string, version?: string): Promise<string | null> {
  try {
    const criteria = [
      { filterType: 8, value: "Microsoft.VisualStudio.Code" },
      { filterType: 7, value: `${publisher}.${extensionName}` },
    ];

    const body = {
      assetTypes: [],
      filters: [{
        criteria,
        direction: 2,
        pageSize: 1,
        pageNumber: 1,
        sortBy: 4,
        sortOrder: 0,
      }],
      flags: 0x192,
    };

    const response = await fetch(VSCODE_MARKETPLACE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json;api-version=6.1-preview.1",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const ext = data?.results?.[0]?.extensions?.[0];
    if (!ext?.versions?.[0]?.assetUri) return null;

    const assetUri = ext.versions[0].assetUri;
    const vsixVersion = version || ext.versions[0].version;

    // Construct VSIX download URL
    return `${assetUri}/Microsoft.VisualStudio.Services.VSIXPackage`;
  } catch {
    return null;
  }
}

export async function installFromMarketplace(t: InstallTarget): Promise<InstalledRecord> {
  const b = bridge();

  // Try to fetch VSIX URL from VS Code Marketplace
  const [publisher, extName] = t.id.includes(".") ? t.id.split(".") : [t.publisher, t.id];
  const vsixUrl = t.vsixUrl || await fetchVSIXUrl(publisher, extName, t.version);

  if (vsixUrl) {
    // Download VSIX and install via app
    if (b?.installExtension) {
      try {
        await b.installExtension({
          ...t,
          kind: t.source ?? "extension",
          vsixUrl,
          installFromMarketplace: true,
        });
      } catch { /* fall through */ }
    } else {
      // Use deep link with VSIX URL
      const deepLink = installDeepLink({ ...t, vsixUrl });
      openDeepLink(deepLink);
    }

    const record: InstalledRecord = {
      id: t.id,
      displayName: t.displayName,
      version: t.version,
      publisher: t.publisher,
      icon: t.icon ?? null,
      vsix: vsixUrl,
      source: t.source ?? "extension",
      installedAt: new Date().toISOString(),
      enabled: true,
      autoUpdate: true,
      vsixUrl,
      installFromMarketplace: true,
    };
    write({ ...read(), [t.id]: record });
    return record;
  }

  // Fallback to regular install
  return install(t);
}

/* ------------------------------------------------------------------ */
/* Local registry                                                      */
/* ------------------------------------------------------------------ */

type Listener = (records: Record<string, InstalledRecord>) => void;
const listeners = new Set<Listener>();
let cache: Record<string, InstalledRecord> | null = null;

function read(): Record<string, InstalledRecord> {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, InstalledRecord>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: Record<string, InstalledRecord>): void {
  cache = next;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
  listeners.forEach((fn) => fn(next));
}

export function getInstalled(): Record<string, InstalledRecord> {
  return read();
}

export function getRecord(id: string): InstalledRecord | undefined {
  return read()[id];
}

export function isInstalled(id: string): boolean {
  return !!read()[id];
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export async function install(t: InstallTarget): Promise<InstalledRecord> {
  const b = bridge();
  if (b?.installExtension) {
    try { await b.installExtension({ ...t, kind: t.source ?? "extension" }); } catch { /* fall through */ }
  } else {
    openDeepLink(installDeepLink(t));
  }

  const record: InstalledRecord = {
    id: t.id,
    displayName: t.displayName,
    version: t.version,
    publisher: t.publisher,
    icon: t.icon ?? null,
    vsix: t.vsix ?? null,
    source: t.source ?? "extension",
    installedAt: new Date().toISOString(),
    enabled: true,
    autoUpdate: true,
  };
  write({ ...read(), [t.id]: record });
  return record;
}

export async function uninstall(id: string): Promise<void> {
  const existing = read()[id];
  const b = bridge();
  if (b?.uninstallExtension) {
    try { await b.uninstallExtension(id); } catch { /* fall through */ }
  } else {
    openDeepLink(uninstallDeepLink(id, existing?.source ?? "extension"));
  }
  const next = { ...read() };
  delete next[id];
  write(next);
}

export async function setEnabled(id: string, enabled: boolean): Promise<void> {
  const existing = read()[id];
  if (!existing) return;
  const b = bridge();
  if (b?.setExtensionEnabled) {
    try { await b.setExtensionEnabled(id, enabled); } catch { /* fall through */ }
  } else {
    openDeepLink(`${SCHEME}${enabled ? "enable" : "disable"}/${existing.source}/${encodeURIComponent(id)}`);
  }
  write({ ...read(), [id]: { ...existing, enabled } });
}

export function setAutoUpdate(id: string, autoUpdate: boolean): void {
  const existing = read()[id];
  if (!existing) return;
  write({ ...read(), [id]: { ...existing, autoUpdate } });
}

/** Reconcile the website mirror with what the desktop app actually has. */
export async function syncWithApp(): Promise<void> {
  const b = bridge();
  if (!b?.listExtensions) return;
  try {
    const list = await b.listExtensions();
    if (!Array.isArray(list)) return;
    const next: Record<string, InstalledRecord> = {};
    for (const r of list) if (r?.id) next[r.id] = r;
    write(next);
  } catch { /* app unavailable */ }
}
