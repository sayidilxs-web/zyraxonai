/** AI sessions and events. */
import { badRequest, forbidden, notFound, readJson, requireString } from './http.server';
import type { ApiContext } from './context.server';

function randomId(prefix: string): string {
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  return `${prefix}_${Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export async function createSession(ctx: ApiContext) {
  const body = await readJson(ctx.request);
  const capabilities = Array.isArray(body['capabilities'])
    ? body['capabilities'].slice(0, 50).map((c) => String(c).slice(0, 80))
    : [];

  // The caller's own identity always wins over a user_id supplied in the body.
  const userId = ctx.userId ?? (typeof body['user_id'] === 'string' && ctx.isAdmin ? body['user_id'] : null);
  const sessionId = randomId('ais');

  const { data, error } = await ctx.db
    .from('ai_sessions')
    .insert({ session_id: sessionId, user_id: userId, capabilities })
    .select('session_id, status, capabilities, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function sessionOrThrow(ctx: ApiContext, sessionId: string) {
  const { data } = await ctx.db
    .from('ai_sessions')
    .select('session_id, user_id, status, events_count, last_active, capabilities, created_at')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (!data) throw notFound('Session not found');
  if (data.user_id && data.user_id !== ctx.userId && !ctx.isAdmin) throw forbidden('Not your session');
  return data;
}

export async function getSession(ctx: ApiContext) {
  const s = await sessionOrThrow(ctx, ctx.params['sessionId']!);
  return {
    session_id: s.session_id,
    status: s.status,
    capabilities: s.capabilities,
    last_active: s.last_active,
    events_count: s.events_count,
    created_at: s.created_at,
  };
}

export async function logEvent(ctx: ApiContext) {
  const s = await sessionOrThrow(ctx, ctx.params['sessionId']!);
  if (s.status === 'ended') throw badRequest('Session has ended');

  const body = await readJson(ctx.request);
  const { error } = await ctx.db.from('ai_events').insert({
    session_id: s.session_id,
    event_type: requireString(body['event_type'], 'event_type', 120),
    data: (body['data'] ?? null) as never,
  });
  if (error) throw new Error(error.message);

  await ctx.db
    .from('ai_sessions')
    .update({ events_count: s.events_count + 1, last_active: new Date().toISOString() })
    .eq('session_id', s.session_id);

  return { logged: true };
}

export async function endSession(ctx: ApiContext) {
  const s = await sessionOrThrow(ctx, ctx.params['sessionId']!);
  await ctx.db.from('ai_sessions').update({ status: 'ended' }).eq('session_id', s.session_id);
  return { session_id: s.session_id, status: 'ended' };
}
