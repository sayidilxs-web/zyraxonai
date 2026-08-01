/** Request context: identity resolution, roles, and rate limiting. */
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { forbidden, tooMany, unauthorized } from './http.server';

export type ApiContext = {
  request: Request;
  url: URL;
  params: Record<string, string>;
  userId: string | null;
  isAdmin: boolean;
  db: typeof supabaseAdmin;
  requireUser: () => string;
  requireAdmin: () => string;
};

async function resolveUser(request: Request): Promise<{ userId: string | null; isAdmin: boolean }> {
  const header = request.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) return { userId: null, isAdmin: false };
  const token = header.slice(7).trim();
  if (token.split('.').length !== 3) return { userId: null, isAdmin: false };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { userId: null, isAdmin: false };

  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id);

  return { userId: data.user.id, isAdmin: (roles ?? []).some((r) => r.role === 'admin') };
}

function clientKey(request: Request, userId: string | null): string {
  if (userId) return `u:${userId}`;
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  return `ip:${ip}`;
}

async function enforceRateLimit(request: Request, userId: string | null, isAdmin: boolean): Promise<void> {
  const limit = isAdmin ? 500 : userId ? 100 : 20;
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    _key: clientKey(request, userId),
    _limit: limit,
  });
  if (error) {
    console.error('[rate-limit]', error.message);
    return; // fail open — never block traffic on limiter failure
  }
  if (data === false) throw tooMany(`Rate limit exceeded (${limit} requests/minute)`);
}

export async function buildContext(
  request: Request,
  url: URL,
  params: Record<string, string>,
): Promise<ApiContext> {
  const { userId, isAdmin } = await resolveUser(request);
  await enforceRateLimit(request, userId, isAdmin);

  return {
    request,
    url,
    params,
    userId,
    isAdmin,
    db: supabaseAdmin,
    requireUser() {
      if (!userId) throw unauthorized();
      return userId;
    },
    requireAdmin() {
      if (!userId) throw unauthorized();
      if (!isAdmin) throw forbidden('Admin role required');
      return userId;
    },
  };
}

/** Resolve a :username path param to a profile id. */
export async function profileByLogin(ctx: ApiContext, login: string) {
  const { data } = await ctx.db
    .from('profiles')
    .select('*')
    .eq('login', login)
    .maybeSingle();
  return data;
}
