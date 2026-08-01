/** Notifications. */
import { notFound, paginate, pageMeta } from './http.server';
import type { ApiContext } from './context.server';

export async function listNotifications(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const { page, limit, from, to } = paginate(ctx.url);
  const unreadOnly = ctx.url.searchParams.get('unread') === 'true';

  let query = ctx.db
    .from('notifications')
    .select('id, type, title, message, read, metadata, created_at', { count: 'exact' })
    .eq('user_id', userId);
  if (unreadOnly) query = query.eq('read', false);

  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);

  const { count: unread } = await ctx.db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  return { notifications: data ?? [], unread_count: unread ?? 0, pagination: pageMeta(page, limit, count ?? 0) };
}

export async function markRead(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const { data, error } = await ctx.db
    .from('notifications')
    .update({ read: true })
    .eq('id', ctx.params['id']!)
    .eq('user_id', userId)
    .select('id, read')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw notFound('Notification not found');
  return data;
}

export async function markAllRead(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const { error } = await ctx.db.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) throw new Error(error.message);
  return { read_all: true };
}
