/** Likes and comments. */
import { badRequest, forbidden, notFound, paginate, pageMeta, readJson, requireString } from './http.server';
import type { ApiContext } from './context.server';
import { PROFILE_PUBLIC_FIELDS, hydrateAuthors } from './shapes.server';

async function itemOrThrow(ctx: ApiContext, id: string) {
  const { data } = await ctx.db.from('ecosystem_items').select('id, author_id').eq('id', id).maybeSingle();
  if (!data) throw notFound('Item not found');
  return data;
}

async function likeCount(ctx: ApiContext, itemId: string) {
  const { count } = await ctx.db.from('likes').select('id', { count: 'exact', head: true }).eq('item_id', itemId);
  return count ?? 0;
}

export async function likeItem(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const item = await itemOrThrow(ctx, ctx.params['id']!);

  const { error } = await ctx.db
    .from('likes')
    .upsert({ user_id: userId, item_id: item.id }, { onConflict: 'user_id,item_id', ignoreDuplicates: true });
  if (error) throw new Error(error.message);

  if (item.author_id !== userId) {
    await ctx.db.from('notifications').insert({
      user_id: item.author_id,
      type: 'like',
      title: 'New like',
      message: 'Someone liked your item',
      metadata: { item_id: item.id, actor_id: userId },
    });
  }

  return { likes_count: await likeCount(ctx, item.id), liked: true };
}

export async function unlikeItem(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const item = await itemOrThrow(ctx, ctx.params['id']!);
  await ctx.db.from('likes').delete().eq('user_id', userId).eq('item_id', item.id);
  return { likes_count: await likeCount(ctx, item.id), liked: false };
}

export async function listLikers(ctx: ApiContext) {
  const item = await itemOrThrow(ctx, ctx.params['id']!);
  const { page, limit, from, to } = paginate(ctx.url);

  const { data, count } = await ctx.db
    .from('likes')
    .select('user_id', { count: 'exact' })
    .eq('item_id', item.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  const ids = (data ?? []).map((l) => l.user_id);
  if (ids.length === 0) return { users: [], total: 0, pagination: pageMeta(page, limit, 0) };

  const { data: users } = await ctx.db.from('profiles').select(PROFILE_PUBLIC_FIELDS).in('id', ids);
  return { users: users ?? [], total: count ?? 0, pagination: pageMeta(page, limit, count ?? 0) };
}

export async function listComments(ctx: ApiContext) {
  const item = await itemOrThrow(ctx, ctx.params['id']!);
  const { page, limit, from, to } = paginate(ctx.url);

  const { data: roots, count } = await ctx.db
    .from('comments')
    .select('id, author_id, content, parent_id, created_at, updated_at', { count: 'exact' })
    .eq('item_id', item.id)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  const rootIds = (roots ?? []).map((c) => c.id);
  const { data: replies } = rootIds.length
    ? await ctx.db
        .from('comments')
        .select('id, author_id, content, parent_id, created_at, updated_at')
        .in('parent_id', rootIds)
        .order('created_at', { ascending: true })
    : { data: [] };

  const hydratedRoots = await hydrateAuthors(ctx, roots ?? []);
  const hydratedReplies = await hydrateAuthors(ctx, replies ?? []);

  return {
    comments: hydratedRoots.map((c) => ({ ...c, replies: hydratedReplies.filter((r) => r.parent_id === c.id) })),
    total: count ?? 0,
    pagination: pageMeta(page, limit, count ?? 0),
  };
}

export async function createComment(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const item = await itemOrThrow(ctx, ctx.params['id']!);
  const body = await readJson(ctx.request);
  const content = requireString(body['content'], 'content', 10000);
  const parentId = typeof body['parent_id'] === 'string' ? body['parent_id'] : null;

  if (parentId) {
    const { data: parent } = await ctx.db.from('comments').select('id, item_id').eq('id', parentId).maybeSingle();
    if (!parent || parent.item_id !== item.id) throw badRequest('parent_id does not belong to this item');
  }

  const { data, error } = await ctx.db
    .from('comments')
    .insert({ author_id: userId, item_id: item.id, parent_id: parentId, content })
    .select('id, author_id, content, parent_id, created_at, updated_at')
    .single();
  if (error) throw new Error(error.message);

  if (item.author_id !== userId) {
    await ctx.db.from('notifications').insert({
      user_id: item.author_id,
      type: 'comment',
      title: 'New comment',
      message: content.slice(0, 140),
      metadata: { item_id: item.id, comment_id: data.id, actor_id: userId },
    });
  }

  const [hydrated] = await hydrateAuthors(ctx, [data]);
  return hydrated;
}

async function commentOrThrow(ctx: ApiContext, id: string) {
  const { data } = await ctx.db.from('comments').select('id, author_id, item_id').eq('id', id).maybeSingle();
  if (!data) throw notFound('Comment not found');
  return data;
}

export async function updateComment(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const comment = await commentOrThrow(ctx, ctx.params['commentId']!);
  if (comment.author_id !== userId && !ctx.isAdmin) throw forbidden('Only the author can edit this comment');

  const body = await readJson(ctx.request);
  const { data, error } = await ctx.db
    .from('comments')
    .update({ content: requireString(body['content'], 'content', 10000) })
    .eq('id', comment.id)
    .select('id, author_id, content, parent_id, created_at, updated_at')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteComment(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const comment = await commentOrThrow(ctx, ctx.params['commentId']!);

  const { data: item } = await ctx.db.from('ecosystem_items').select('author_id').eq('id', comment.item_id).maybeSingle();
  const allowed = comment.author_id === userId || item?.author_id === userId || ctx.isAdmin;
  if (!allowed) throw forbidden('Only the comment author or item owner can delete this comment');

  const { error } = await ctx.db.from('comments').delete().eq('id', comment.id);
  if (error) throw new Error(error.message);
  return { deleted: true, id: comment.id };
}
