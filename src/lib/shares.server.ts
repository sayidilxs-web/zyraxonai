/**
 * GitHub-backed storage for ZYRAXON share sessions.
 *
 * Each share is a single JSON file: shares/{id}.json in the shares repo.
 * No database required.
 */

const API = 'https://api.github.com';
const MAX_SHARE_BYTES = 10 * 1024 * 1024; // 10 MB

export type ShareRecord = {
  id: string;
  secretHash: string;
  sessionID: string;
  timeCreated: string;
  timeUpdated: string;
  session: Record<string, unknown> | null;
  messages: Record<string, unknown>[];
  parts: Record<string, unknown>[];
  diffs: Record<string, unknown>[];
  models: Record<string, unknown>[];
};

export type PublicShare = Omit<ShareRecord, 'secretHash'>;

function token(): string {
  const t = process.env['GITHUB_PERSONAL_ACCESS_TOKEN'];
  if (!t) throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is not configured');
  return t;
}

function repoName(): string {
  return process.env['GITHUB_SHARES_REPO'] || 'ZYRAXON-shares';
}

function branch(): string {
  return process.env['GITHUB_SHARES_BRANCH'] || 'main';
}

let cachedOwner: string | null = null;

async function owner(): Promise<string> {
  const configured = process.env['GITHUB_SHARES_OWNER'];
  if (configured) return configured;
  if (cachedOwner) return cachedOwner;
  const res = await gh('/user');
  const body = (await res.json()) as { login: string };
  cachedOwner = body.login;
  return cachedOwner;
}

async function gh(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token()}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zyraxon-share-api',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} on ${path}: ${text.slice(0, 400)}`);
  }
  return res;
}

/** Create the shares repo if it does not exist yet. */
async function ensureRepo(): Promise<void> {
  const login = await owner();
  const res = await gh(`/repos/${login}/${repoName()}`);
  if (res.status !== 404) return;
  await gh('/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name: repoName(),
      description: 'Public ZYRAXON AI shared sessions',
      private: false,
      auto_init: true,
    }),
  });
}

function filePath(id: string): string {
  return `shares/${id}.json`;
}

function toBase64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

function fromBase64(b64: string): string {
  return Buffer.from(b64.replace(/\n/g, ''), 'base64').toString('utf8');
}

async function readFile(id: string): Promise<{ record: ShareRecord; sha: string } | null> {
  const login = await owner();
  const res = await gh(
    `/repos/${login}/${repoName()}/contents/${filePath(id)}?ref=${encodeURIComponent(branch())}`,
  );
  if (res.status === 404) return null;
  const body = (await res.json()) as { content?: string; sha: string };
  if (!body.content) return null;
  return { record: JSON.parse(fromBase64(body.content)) as ShareRecord, sha: body.sha };
}

async function writeFile(record: ShareRecord, sha?: string): Promise<void> {
  const login = await owner();
  const json = JSON.stringify(record, null, 2);
  if (Buffer.byteLength(json, 'utf8') > MAX_SHARE_BYTES) {
    throw new Error('Share exceeds the 10MB limit');
  }
  await gh(`/repos/${login}/${repoName()}/contents/${filePath(record.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `${sha ? 'update' : 'create'} share ${record.id}`,
      content: toBase64(json),
      branch: branch(),
      ...(sha ? { sha } : {}),
    }),
  });
}

function randomId(prefix: string, bytes = 12): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

async function hash(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createShare(sessionID: string): Promise<{ id: string; secret: string }> {
  await ensureRepo();
  const id = randomId('share');
  const secret = randomId('secret', 24);
  const now = new Date().toISOString();
  const record: ShareRecord = {
    id,
    secretHash: await hash(secret),
    sessionID,
    timeCreated: now,
    timeUpdated: now,
    session: null,
    messages: [],
    parts: [],
    diffs: [],
    models: [],
  };
  await writeFile(record);
  return { id, secret };
}

type SyncItem = { type?: string; data?: unknown } & Record<string, unknown>;

function upsert(list: Record<string, unknown>[], item: Record<string, unknown>) {
  const id = item['id'];
  const idx = id ? list.findIndex((x) => x['id'] === id) : -1;
  if (idx >= 0) list[idx] = { ...list[idx], ...item };
  else list.push(item);
}

export async function syncShare(id: string, secret: string, items: SyncItem[]): Promise<PublicShare> {
  const found = await readFile(id);
  if (!found) throw Object.assign(new Error('Share not found'), { status: 404 });
  const record = found.record;
  if (!timingSafeEqual(record.secretHash, await hash(secret))) {
    throw Object.assign(new Error('Invalid secret'), { status: 403 });
  }

  for (const raw of items) {
    const type = String(raw.type ?? '').toLowerCase();
    const data = (raw.data ?? raw) as Record<string, unknown>;
    if (type === 'session') record.session = { ...(record.session ?? {}), ...data };
    else if (type === 'message') upsert(record.messages, data);
    else if (type === 'part') upsert(record.parts, data);
    else if (type === 'diff' || type === 'file') upsert(record.diffs, data);
    else if (type === 'model') upsert(record.models, data);
  }

  record.timeUpdated = new Date().toISOString();
  await writeFile(record, found.sha);
  return publicView(record);
}

export async function deleteShare(id: string, secret: string): Promise<void> {
  const found = await readFile(id);
  if (!found) throw Object.assign(new Error('Share not found'), { status: 404 });
  if (!timingSafeEqual(found.record.secretHash, await hash(secret))) {
    throw Object.assign(new Error('Invalid secret'), { status: 403 });
  }
  const login = await owner();
  await gh(`/repos/${login}/${repoName()}/contents/${filePath(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ message: `delete share ${id}`, sha: found.sha, branch: branch() }),
  });
}

export async function getShare(id: string): Promise<PublicShare | null> {
  const found = await readFile(id);
  if (!found) return null;
  return publicView(found.record);
}

function publicView(record: ShareRecord): PublicShare {
  const { secretHash: _secretHash, ...rest } = record;
  return rest;
}
