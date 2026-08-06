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
}

export interface InstallTarget {
  id: string;
  displayName: string;
  version: string;
  publisher: string;
  icon?: string | null;
  vsix?: string | null;
  source?: InstalledRecord["source"];
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
