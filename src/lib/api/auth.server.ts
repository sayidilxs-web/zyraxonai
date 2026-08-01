/** GitHub OAuth exchange backed by Lovable Cloud auth sessions. */
import { createClient } from '@supabase/supabase-js';
import { HttpError, badRequest, readJson, requireString } from './http.server';
import type { ApiContext } from './context.server';

type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
};

async function githubToken(code: string): Promise<string> {
  const clientId = process.env['GITHUB_CLIENT_ID'];
  const clientSecret = process.env['GITHUB_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    throw new HttpError(500, 'NOT_CONFIGURED', 'GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET are not configured');
  }
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const body = (await res.json()) as { access_token?: string; error_description?: string };
  if (!body.access_token) throw badRequest(body.error_description ?? 'GitHub rejected the authorization code');
  return body.access_token;
}

async function githubGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'zyraxon-api',
    },
  });
  if (!res.ok) throw new HttpError(502, 'GITHUB_ERROR', `GitHub API ${res.status} on ${path}`);
  return (await res.json()) as T;
}

/** Mint a Lovable Cloud session for an email address without a password. */
async function mintSession(email: string) {
  const url = process.env['SUPABASE_URL'];
  const publishable = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !publishable) throw new HttpError(500, 'NOT_CONFIGURED', 'Backend auth is not configured');

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data.properties?.hashed_token) {
    throw new HttpError(500, 'AUTH_ERROR', error?.message ?? 'Could not create a session');
  }

  const anon = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get('Authorization') === `Bearer ${publishable}`) headers.delete('Authorization');
        headers.set('apikey', publishable);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const verified = await anon.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'email' });
  if (verified.error || !verified.data.session) {
    throw new HttpError(500, 'AUTH_ERROR', verified.error?.message ?? 'Could not verify the session');
  }
  return verified.data.session;
}

export async function githubExchange(ctx: ApiContext) {
  const body = await readJson<{ code?: string }>(ctx.request);
  const code = requireString(body.code, 'code', 500);

  const token = await githubToken(code);
  const ghUser = await githubGet<GitHubUser>('/user', token);
  const emails = await githubGet<{ email: string; primary: boolean; verified: boolean }[]>('/user/emails', token).catch(
    () => [],
  );
  const email =
    emails.find((e) => e.primary && e.verified)?.email ??
    emails.find((e) => e.verified)?.email ??
    ghUser.email ??
    `${ghUser.login}@users.noreply.github.com`;

  const { data: existing } = await ctx.db.from('profiles').select('id').eq('github_id', ghUser.id).maybeSingle();

  if (!existing) {
    const created = await ctx.db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { user_name: ghUser.login, full_name: ghUser.name, avatar_url: ghUser.avatar_url },
    });
    if (created.error && !/already/i.test(created.error.message)) {
      throw new HttpError(500, 'AUTH_ERROR', created.error.message);
    }
  }

  const session = await mintSession(email);

  await ctx.db
    .from('profiles')
    .update({
      github_id: ghUser.id,
      github_login: ghUser.login,
      name: ghUser.name,
      avatar_url: ghUser.avatar_url,
      bio: ghUser.bio,
      blog: ghUser.blog,
      location: ghUser.location,
      email,
    })
    .eq('id', session.user.id);

  const { data: profile } = await ctx.db.from('profiles').select('*').eq('id', session.user.id).maybeSingle();

  return {
    user: {
      id: session.user.id,
      login: profile?.login ?? ghUser.login,
      name: profile?.name ?? ghUser.name,
      avatar_url: profile?.avatar_url ?? ghUser.avatar_url,
      email,
    },
    token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
  };
}

export function githubCallbackRedirect(ctx: ApiContext): Response {
  const code = ctx.url.searchParams.get('code') ?? '';
  const state = ctx.url.searchParams.get('state') ?? '';
  const target = new URL('/', ctx.url.origin);
  if (code) target.searchParams.set('code', code);
  if (state) target.searchParams.set('state', state);
  return new Response(null, { status: 302, headers: { Location: target.toString() } });
}
