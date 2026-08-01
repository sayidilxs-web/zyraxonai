/** Ecosystem items + versions. */
import { badRequest, conflict, forbidden, notFound, optionalString, paginate, pageMeta, readJson, requireString, slugify } from './http.server';
import type { ApiContext } from './context.server';
import { ITEM_FIELDS, SORTS, hydrateAuthors } from './shapes.server';

const CATEGORIES = ['website', 'sdk', 'pdf', 'ai_bot', 'plugin', 'template', 'mobile_app', 'api'] as const;
type Category = (typeof CATEGORIES)[number];

function parseCategory(value: unknown): Category {
  if (typeof value !== 'string' || !CATEGORIES.includes(value as Category)) {
    throw badRequest(`category must be one of: ${CATEGORIES.join(', ')}`);
  }
  return value as Category;
}

function parseTags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw badRequest('tags must be an array of strings');
  return value.slice(0, 20).map((t) => String(t).slice(0, 40));
}

export async function listItems(ctx: ApiContext) {
  const { page, limit, from, to } = paginate(ctx.url);
  const sort = SORTS[ctx.url.searchParams.get('sort') ?? 'newest'] ?? SORTS['newest']!;
  const category = ctx.url.searchParams.get('category');
  const search = ctx.url.searchParams.get('search');
  const author = ctx.url.searchParams.get('author');

  let query = ctx.db.from('ecosystem_items').select(ITEM_FIELDS, { count: 'exact' }).eq('status', 'published');
  if (category) query = query.eq('category', parseCategory(category));
  if (author) query = query.eq('author_id', author);
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

  const { data, count, error } = await query.order(sort.column, { ascending: sort.ascending }).range(from, to);
  if (error) throw new Error(error.message);

  return {
    items: await hydrateAuthors(ctx, data ?? []),
    total: count ?? 0,
    page,
    has_more: page * limit < (count ?? 0),
    pagination: pageMeta(page, limit, count ?? 0),
  };
}

export async function createItem(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const body = await readJson(ctx.request);

  const title = requireString(body['title'], 'title', 200);
  const category = parseCategory(body['category']);
  const slug = slugify(typeof body['slug'] === 'string' ? body['slug'] : title);

  const { data, error } = await ctx.db
    .from('ecosystem_items')
    .insert({
      author_id: userId,
      title,
      slug,
      category,
      description: optionalString(body['description'], 'description', 4000),
      content: (body['content'] ?? null) as never,
      tags: parseTags(body['tags']),
      github_url: optionalString(body['github_url'], 'github_url', 1000),
      demo_url: optionalString(body['demo_url'], 'demo_url', 1000),
      thumbnail_url: optionalString(body['thumbnail_url'], 'thumbnail_url', 1000),
      status: body['status'] === 'draft' ? 'draft' : 'published',
    })
    .select(ITEM_FIELDS)
    .single();

  if (error) {
    if (error.code === '23505') throw conflict('You already have an item with this slug');
    throw new Error(error.message);
  }
  return data;
}

async function loadItem(ctx: ApiContext, id: string) {
  const { data } = await ctx.db.from('ecosystem_items').select(ITEM_FIELDS).eq('id', id).maybeSingle();
  if (!data) throw notFound('Item not found');
  return data;
}

function assertOwner(ctx: ApiContext, item: { author_id: string }) {
  const userId = ctx.requireUser();
  if (item.author_id !== userId && !ctx.isAdmin) throw forbidden('Only the owner can modify this item');
  return userId;
}

export async function getItem(ctx: ApiContext) {
  const item = await loadItem(ctx, ctx.params['id']!);
  if (item.status !== 'published' && item.author_id !== ctx.userId && !ctx.isAdmin) throw notFound('Item not found');

  await ctx.db.rpc('increment_item_counter', { _item_id: item.id, _column: 'views_count' });
  await ctx.db.from('analytics_events').insert({ event_type: 'view', item_id: item.id, user_id: ctx.userId });

  const [hydrated] = await hydrateAuthors(ctx, [item]);
  const liked = ctx.userId
    ? Boolean((await ctx.db.from('likes').select('id').eq('item_id', item.id).eq('user_id', ctx.userId).maybeSingle()).data)
    : false;

  return { ...hydrated, liked };
}

export async function updateItem(ctx: ApiContext) {
  const item = await loadItem(ctx, ctx.params['id']!);
  assertOwner(ctx, item);
  const body = await readJson(ctx.request);

  const patch: Record<string, unknown> = {};
  if ('title' in body) patch['title'] = requireString(body['title'], 'title', 200);
  if ('description' in body) patch['description'] = optionalString(body['description'], 'description', 4000);
  if ('content' in body) patch['content'] = body['content'] ?? null;
  if ('tags' in body) patch['tags'] = parseTags(body['tags']);
  if ('github_url' in body) patch['github_url'] = optionalString(body['github_url'], 'github_url', 1000);
  if ('demo_url' in body) patch['demo_url'] = optionalString(body['demo_url'], 'demo_url', 1000);
  if ('thumbnail_url' in body) patch['thumbnail_url'] = optionalString(body['thumbnail_url'], 'thumbnail_url', 1000);
  if ('category' in body) patch['category'] = parseCategory(body['category']);
  if ('status' in body && ['draft', 'published', 'archived'].includes(String(body['status']))) {
    patch['status'] = body['status'];
  }

  const { data, error } = await ctx.db
    .from('ecosystem_items')
    .update(patch as never)
    .eq('id', item.id)
    .select(ITEM_FIELDS)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteItem(ctx: ApiContext) {
  const item = await loadItem(ctx, ctx.params['id']!);
  assertOwner(ctx, item);
  const { error } = await ctx.db.from('ecosystem_items').delete().eq('id', item.id);
  if (error) throw new Error(error.message);
  return { deleted: true, id: item.id };
}

export async function listVersions(ctx: ApiContext) {
  const item = await loadItem(ctx, ctx.params['id']!);
  const { data } = await ctx.db
    .from('item_versions')
    .select('id, version, description, downloads, created_at')
    .eq('item_id', item.id)
    .order('created_at', { ascending: false });
  return { versions: data ?? [] };
}

export async function createVersion(ctx: ApiContext) {
  const item = await loadItem(ctx, ctx.params['id']!);
  assertOwner(ctx, item);
  const body = await readJson(ctx.request);

  const { data, error } = await ctx.db
    .from('item_versions')
    .insert({
      item_id: item.id,
      version: requireString(body['version'], 'version', 50),
      description: optionalString(body['description'], 'description', 4000),
      content: (body['content'] ?? null) as never,
    })
    .select('id, version, description, downloads, created_at')
    .single();

  if (error) {
    if (error.code === '23505') throw conflict('This version already exists');
    throw new Error(error.message);
  }
  return data;
}

export async function categoryStats(ctx: ApiContext) {
  const icons: Record<Category, string> = {
    website: 'globe',
    sdk: 'package',
    pdf: 'file-text',
    ai_bot: 'bot',
    plugin: 'puzzle',
    template: 'layout-template',
    mobile_app: 'smartphone',
    api: 'plug',
  };

  const counts = await Promise.all(
    CATEGORIES.map(async (name) => {
      const { count } = await ctx.db
        .from('ecosystem_items')
        .select('id', { count: 'exact', head: true })
        .eq('category', name)
        .eq('status', 'published');
      return { name, count: count ?? 0, icon: icons[name] };
    }),
  );
  return { categories: counts };
}
