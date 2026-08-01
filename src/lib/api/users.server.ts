/** Users, stats, follows. */
import { forbidden, notFound, optionalString, ok, paginate, pageMeta, readJson } from './http.server';
import type { ApiContext } from './context.server';
import { profileByLogin } from './context.server';
import { ITEM_FIELDS, PROFILE_PUBLIC_FIELDS, hydrateAuthors } from './shapes.server';

async function mustFindProfile(ctx: ApiContext, login: string) {
  const profile = await profileByLogin(ctx, login);
  if (!profile) throw notFound('User not found');
  return profile;
}

export async function getUser(ctx: ApiContext) {
  const profile = await mustFindProfile(ctx, ctx.params['username']!);
  const isSelf = ctx.userId === profile.id;

  const [{ count: items }, { count: followers }, { count: following }] = await Promise.all([
    ctx.db.from('ecosystem_items').select('id', { count: 'exact', head: true }).eq('author_id', profile.id).eq('status', 'published'),
    ctx.db.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id),
    ctx.db.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ]);

  return {
    id: profile.id,
    login: profile.login,
    name: profile.name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    blog: profile.blog,
    location: profile.location,
    email: isSelf || ctx.isAdmin ? profile.email : null,
    github_login: profile.github_login,
    created_at: profile.created_at,
    public_repos: items ?? 0,
    followers: followers ?? 0,
    following: following ?? 0,
  };
}

export async function updateUser(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const profile = await mustFindProfile(ctx, ctx.params['username']!);
  if (profile.id !== userId && !ctx.isAdmin) throw forbidden('You can only update your own profile');

  const body = await readJson(ctx.request);
  const patch: Record<string, unknown> = {};
  if ('bio' in body) patch['bio'] = optionalString(body['bio'], 'bio', 2000);
  if ('blog' in body) patch['blog'] = optionalString(body['blog'], 'blog', 500);
  if ('location' in body) patch['location'] = optionalString(body['location'], 'location', 200);
  if ('name' in body) patch['name'] = optionalString(body['name'], 'name', 200);
  if ('avatar_url' in body) patch['avatar_url'] = optionalString(body['avatar_url'], 'avatar_url', 1000);

  const { data, error } = await ctx.db.from('profiles').update(patch).eq('id', profile.id).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function userStats(ctx: ApiContext) {
  const profile = await mustFindProfile(ctx, ctx.params['username']!);

  const { data: items } = await ctx.db.from('ecosystem_items').select('likes_count').eq('author_id', profile.id);
  const [{ count: itemsCount }, { count: followers }, { count: following }] = await Promise.all([
    ctx.db.from('ecosystem_items').select('id', { count: 'exact', head: true }).eq('author_id', profile.id).eq('status', 'published'),
    ctx.db.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id),
    ctx.db.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ]);

  return {
    items_count: itemsCount ?? 0,
    likes_received: (items ?? []).reduce((sum, i) => sum + (i.likes_count ?? 0), 0),
    followers_count: followers ?? 0,
    following_count: following ?? 0,
  };
}

export async function userLikes(ctx: ApiContext) {
  const profile = await mustFindProfile(ctx, ctx.params['username']!);
  const { page, limit, from, to } = paginate(ctx.url);

  const { data: likes, count } = await ctx.db
    .from('likes')
    .select('item_id', { count: 'exact' })
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  const ids = (likes ?? []).map((l) => l.item_id);
  if (ids.length === 0) return { items: [], pagination: pageMeta(page, limit, count ?? 0) };

  const { data: items } = await ctx.db.from('ecosystem_items').select(ITEM_FIELDS).in('id', ids).eq('status', 'published');
  return { items: await hydrateAuthors(ctx, items ?? []), pagination: pageMeta(page, limit, count ?? 0) };
}

export async function followUser(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const profile = await mustFindProfile(ctx, ctx.params['username']!);
  if (profile.id === userId) throw forbidden('You cannot follow yourself');

  await ctx.db.from('follows').upsert(
    { follower_id: userId, following_id: profile.id },
    { onConflict: 'follower_id,following_id', ignoreDuplicates: true },
  );

  await ctx.db.from('notifications').insert({
    user_id: profile.id,
    type: 'follow',
    title: 'New follower',
    message: 'Someone started following you',
    metadata: { follower_id: userId },
  });

  const { count } = await ctx.db.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id);
  return { following: true, followers_count: count ?? 0 };
}

export async function unfollowUser(ctx: ApiContext) {
  const userId = ctx.requireUser();
  const profile = await mustFindProfile(ctx, ctx.params['username']!);
  await ctx.db.from('follows').delete().eq('follower_id', userId).eq('following_id', profile.id);
  const { count } = await ctx.db.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id);
  return { following: false, followers_count: count ?? 0 };
}

async function listRelated(ctx: ApiContext, column: 'follower_id' | 'following_id', match: 'follower_id' | 'following_id') {
  const profile = await mustFindProfile(ctx, ctx.params['username']!);
  const { page, limit, from, to } = paginate(ctx.url);
  const { data, count } = await ctx.db
    .from('follows')
    .select(column, { count: 'exact' })
    .eq(match, profile.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  const ids = (data ?? []).map((row) => (row as Record<string, string>)[column]!);
  if (ids.length === 0) return { users: [], pagination: pageMeta(page, limit, count ?? 0) };
  const { data: users } = await ctx.db.from('profiles').select(PROFILE_PUBLIC_FIELDS).in('id', ids);
  return { users: users ?? [], total: count ?? 0, pagination: pageMeta(page, limit, count ?? 0) };
}

export const listFollowers = (ctx: ApiContext) => listRelated(ctx, 'follower_id', 'following_id');
export const listFollowing = (ctx: ApiContext) => listRelated(ctx, 'following_id', 'follower_id');

export { ok };
