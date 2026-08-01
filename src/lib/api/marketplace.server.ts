/** Marketplace, search, categories. */
import { forbidden, notFound, paginate, pageMeta } from './http.server';
import type { ApiContext } from './context.server';
import { ITEM_FIELDS, PROFILE_PUBLIC_FIELDS, SORTS, hydrateAuthors } from './shapes.server';

export async function marketplaceItems(ctx: ApiContext) {
  const { page, limit, from, to } = paginate(ctx.url);
  const sortKey = ctx.url.searchParams.get('sort') ?? 'trending';
  const sort = SORTS[sortKey] ?? SORTS['newest']!;
  const category = ctx.url.searchParams.get('category');

  let query = ctx.db
    .from('ecosystem_items')
    .select(ITEM_FIELDS, { count: 'exact' })
    .eq('status', 'published')
    .eq('marketplace_published', true);
  if (category) query = query.eq('category', category as never);

  const { data, count, error } = await query.order(sort.column, { ascending: sort.ascending }).range(from, to);
  if (error) throw new Error(error.message);

  return {
    items: await hydrateAuthors(ctx, data ?? []),
    total: count ?? 0,
    has_more: page * limit < (count ?? 0),
    pagination: pageMeta(page, limit, count ?? 0),
  };
}

async function ownedItem(ctx: ApiContext, id: string) {
  const userId = ctx.requireUser();
  const { data } = await ctx.db.from('ecosystem_items').select('id, author_id, status, slug').eq('id', id).maybeSingle();
  if (!data) throw notFound('Item not found');
  if (data.author_id !== userId && !ctx.isAdmin) throw forbidden('Only the owner can change marketplace status');
  return data;
}

export async function publishToMarketplace(ctx: ApiContext) {
  const item = await ownedItem(ctx, ctx.params['id']!);
  if (item.status !== 'published') throw forbidden('Item must be published before it can go to the marketplace');
  await ctx.db.from('ecosystem_items').update({ marketplace_published: true }).eq('id', item.id);
  return { published: true, marketplace_url: `${ctx.url.origin}/marketplace/${item.id}` };
}

export async function unpublishFromMarketplace(ctx: ApiContext) {
  const item = await ownedItem(ctx, ctx.params['id']!);
  await ctx.db.from('ecosystem_items').update({ marketplace_published: false }).eq('id', item.id);
  return { published: false };
}

export async function trending(ctx: ApiContext) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await ctx.db
    .from('ecosystem_items')
    .select(ITEM_FIELDS)
    .eq('status', 'published')
    .gte('created_at', since)
    .limit(100);

  const scored = (data ?? [])
    .map((i) => ({ ...i, score: i.likes_count * 3 + i.comments_count * 2 + i.views_count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return { items: await hydrateAuthors(ctx, scored) };
}

export async function featured(ctx: ApiContext) {
  const { data } = await ctx.db
    .from('ecosystem_items')
    .select(ITEM_FIELDS)
    .eq('status', 'published')
    .eq('featured', true)
    .order('likes_count', { ascending: false })
    .limit(20);
  return { items: await hydrateAuthors(ctx, data ?? []) };
}

export async function search(ctx: ApiContext) {
  const q = (ctx.url.searchParams.get('q') ?? '').trim();
  const type = ctx.url.searchParams.get('type') ?? 'all';
  const { page, limit, from, to } = paginate(ctx.url);
  if (!q) return { items: [], users: [], total: 0, pagination: pageMeta(page, limit, 0) };

  const wantItems = type === 'all' || type === 'items';
  const wantUsers = type === 'all' || type === 'users';

  const itemsResult = wantItems
    ? await ctx.db
        .from('ecosystem_items')
        .select(ITEM_FIELDS, { count: 'exact' })
        .eq('status', 'published')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .order('likes_count', { ascending: false })
        .range(from, to)
    : { data: [], count: 0 };

  const usersResult = wantUsers
    ? await ctx.db
        .from('profiles')
        .select(PROFILE_PUBLIC_FIELDS, { count: 'exact' })
        .or(`login.ilike.%${q}%,name.ilike.%${q}%`)
        .range(from, to)
    : { data: [], count: 0 };

  const total = (itemsResult.count ?? 0) + (usersResult.count ?? 0);
  return {
    items: await hydrateAuthors(ctx, itemsResult.data ?? []),
    users: usersResult.data ?? [],
    total,
    pagination: pageMeta(page, limit, total),
  };
}
