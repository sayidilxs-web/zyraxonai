/**
 * Publish an AI-generated single-file site to the user's GitHub account
 * and serve it from GitHub Pages (optionally on a custom domain).
 *
 * The GitHub token is supplied by the end user per request and is never
 * stored server-side.
 */

const GH = 'https://api.github.com';

type GhInit = { token: string; method?: string; body?: unknown };

async function gh<T = any>(path: string, { token, method = 'GET', body }: GhInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${GH}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zyraxon-blueprint',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

function b64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

async function putFile(token: string, owner: string, repo: string, path: string, content: string, message: string) {
  const existing = await gh<any>(`/repos/${owner}/${repo}/contents/${path}`, { token });
  const sha = existing.ok ? existing.data?.sha : undefined;
  return gh(`/repos/${owner}/${repo}/contents/${path}`, {
    token,
    method: 'PUT',
    body: { message, content: b64(content), ...(sha ? { sha } : {}) },
  });
}

export type PublishInput = {
  token: string;
  repo: string;
  html: string;
  description?: string;
  customDomain?: string;
  privateRepo?: boolean;
};

export type PublishResult = {
  ok: boolean;
  error?: string;
  owner?: string;
  repo?: string;
  repoUrl?: string;
  pagesUrl?: string;
  customDomain?: string | null;
  dns?: { type: string; name: string; value: string }[];
  note?: string;
};

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/i;
const REPO_RE = /^[A-Za-z0-9._-]{1,90}$/;

export async function publishSite(input: PublishInput): Promise<PublishResult> {
  const { token, html } = input;
  const repo = (input.repo || '').trim();
  const customDomain = (input.customDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  if (!token) return { ok: false, error: 'GitHub access token is required.' };
  if (!REPO_RE.test(repo)) return { ok: false, error: 'Invalid repository name.' };
  if (!html || html.length < 30) return { ok: false, error: 'Nothing to publish yet — generate a site first.' };
  if (customDomain && !DOMAIN_RE.test(customDomain)) return { ok: false, error: 'Invalid custom domain.' };

  const me = await gh<{ login: string }>('/user', { token });
  if (!me.ok || !me.data?.login) {
    return { ok: false, error: 'GitHub token rejected. It needs the "repo" scope.' };
  }
  const owner = me.data.login;

  // Create the repo if it does not exist yet.
  const repoInfo = await gh(`/repos/${owner}/${repo}`, { token });
  if (!repoInfo.ok) {
    const created = await gh('/user/repos', {
      token,
      method: 'POST',
      body: {
        name: repo,
        description: input.description || 'Built with ZYRAXON Blueprint',
        private: Boolean(input.privateRepo),
        auto_init: true,
      },
    });
    if (!created.ok) {
      return { ok: false, error: `Could not create repository: ${(created.data as any)?.message || created.status}` };
    }
    // give GitHub a moment to initialise the default branch
    await new Promise((r) => setTimeout(r, 1500));
  }

  const put = await putFile(token, owner, repo, 'index.html', html, 'ZYRAXON Blueprint: publish site');
  if (!put.ok) {
    return { ok: false, error: `Could not write index.html: ${(put.data as any)?.message || put.status}` };
  }
  await putFile(token, owner, repo, '.nojekyll', '', 'ZYRAXON Blueprint: disable jekyll');
  if (customDomain) {
    await putFile(token, owner, repo, 'CNAME', `${customDomain}\n`, 'ZYRAXON Blueprint: custom domain');
  }

  // Enable GitHub Pages from the default branch root.
  const pages = await gh<any>(`/repos/${owner}/${repo}/pages`, { token });
  if (!pages.ok) {
    const branch = (repoInfo.data as any)?.default_branch || 'main';
    await gh(`/repos/${owner}/${repo}/pages`, {
      token,
      method: 'POST',
      body: { source: { branch, path: '/' } },
    });
  }

  if (customDomain) {
    await gh(`/repos/${owner}/${repo}/pages`, {
      token,
      method: 'PUT',
      body: { cname: customDomain, https_enforced: true },
    }).catch(() => undefined);
  }

  const final = await gh<any>(`/repos/${owner}/${repo}/pages`, { token });
  const pagesUrl = final.ok ? final.data?.html_url : `https://${owner}.github.io/${repo}/`;
  const apex = customDomain ? customDomain.split('.').length === 2 : false;

  return {
    ok: true,
    owner,
    repo,
    repoUrl: `https://github.com/${owner}/${repo}`,
    pagesUrl: customDomain ? `https://${customDomain}/` : pagesUrl,
    customDomain: customDomain || null,
    dns: customDomain
      ? apex
        ? [
            { type: 'A', name: '@', value: '185.199.108.153' },
            { type: 'A', name: '@', value: '185.199.109.153' },
            { type: 'A', name: '@', value: '185.199.110.153' },
            { type: 'A', name: '@', value: '185.199.111.153' },
          ]
        : [{ type: 'CNAME', name: customDomain.split('.')[0]!, value: `${owner}.github.io` }]
      : undefined,
    note: 'GitHub Pages can take 1–2 minutes for the first build. Custom domains also need the DNS records above.',
  };
}
