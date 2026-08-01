/** Analytics tracking and reporting. */
import { badRequest, notFound, readJson, requireString } from './http.server';
import type { ApiContext } from './context.server';

const TRACKABLE = ['view', 'download', 'click'];

export async function track(ctx: ApiContext) {
  const body = await readJson(ctx.request);
  const eventType = requireString(body['event_type'], 'event_type', 60);
  if (!TRACKABLE.includes(eventType)) throw badRequest(`event_type must be one of: ${TRACKABLE.join(', ')}`);

  const itemId = typeof body['item_id'] === 'string' ? body['item_id'] : null;
  const { error } = await ctx.db.from('analytics_events').insert({
    event_type: eventType,
    item_id: itemId,
    user_id: ctx.userId,
    metadata: (body['metadata'] ?? null) as never,
  });
  if (error) throw new Error(error.message);

  if (itemId && eventType === 'download') {
    await ctx.db.rpc('increment_item_counter', { _item_id: itemId, _column: 'downloads_count' });
  }
  if (itemId && eventType === 'view') {
    await ctx.db.rpc('increment_item_counter', { _item_id: itemId, _column: 'views_count' });
  }
  return { tracked: true };
}

async function itemOrThrow(ctx: ApiContext, id: string) {
  const { data } = await ctx.db
    .from('ecosystem_items')
    .select('id, downloads_count, views_count')
    .eq('id', id)
    .maybeSingle();
  if (!data) throw notFound('Item not found');
  return data;
}

export async function downloads(ctx: ApiContext) {
  const item = await itemOrThrow(ctx, ctx.params['itemId']!);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await ctx.db
    .from('analytics_events')
    .select('created_at')
    .eq('item_id', item.id)
    .eq('event_type', 'download')
    .gte('created_at', since);

  const byDay = new Map<string, number>();
  for (const row of data ?? []) {
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return {
    downloads: item.downloads_count,
    history: [...byDay.entries()].sort().map(([date, count]) => ({ date, count })),
  };
}

export async function views(ctx: ApiContext) {
  const item = await itemOrThrow(ctx, ctx.params['itemId']!);
  const { data } = await ctx.db
    .from('analytics_events')
    .select('user_id')
    .eq('item_id', item.id)
    .eq('event_type', 'view');

  const unique = new Set((data ?? []).map((r) => r.user_id).filter(Boolean));
  return { views: item.views_count, unique_views: unique.size };
}
