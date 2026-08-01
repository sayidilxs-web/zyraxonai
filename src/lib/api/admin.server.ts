/** Admin moderation endpoints. */
import { notFound } from './http.server';
import type { ApiContext } from './context.server';
import { ITEM_FIELDS, hydrateAuthors } from './shapes.server';

export async function stats(ctx: ApiContext) {
  ctx.requireAdmin();
  const [users, items, likes, comments, sessions] = await Promise.all([
    ctx.db.from('profiles').select('id', { count: 'exact', head: true }),
    ctx.db.from('ecosystem_items').select('id', { count: 'exact', head: true }),
    ctx.db.from('likes').select('id', { count: 'exact', head: true }),
    ctx.db.from('comments').select('id', { count: 'exact', head: true }),
    ctx.db.from('ai_sessions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  return {
    total_users: users.count ?? 0,
    total_items: items.count ?? 0,
    total_likes: likes.count ?? 0,
    total_comments: comments.count ?? 0,
    active_sessions: sessions.count ?? 0,
  };
}

export async function pendingItems(ctx: ApiContext) {
  ctx.requireAdmin();
  const { data } = await ctx.db
    .from('ecosystem_items')
    .select(ITEM_FIELDS)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);
  return { items: await hydrateAuthors(ctx, data ?? []) };
}

async function setStatus(ctx: ApiContext, status: 'published' | 'rejected') {
  ctx.requireAdmin();
  const { data, error } = await ctx.db
    .from('ecosystem_items')
    .update({ status })
    .eq('id', ctx.params['id']!)
    .select('id, status, author_id, title')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw notFound('Item not found');

  await ctx.db.from('notifications').insert({
    user_id: data.author_id,
    type: status === 'published' ? 'item_approved' : 'item_rejected',
    title: status === 'published' ? 'Item approved' : 'Item rejected',
    message: data.title,
    metadata: { item_id: data.id },
  });

  return data;
}

export const approveItem = (ctx: ApiContext) => setStatus(ctx, 'published');
export const rejectItem = (ctx: ApiContext) => setStatus(ctx, 'rejected');
