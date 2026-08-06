/** Shared shapes and hydration helpers for API payloads. */
import type { ApiContext } from './context.server';

export const PROFILE_FIELDS = 'id, login, name, avatar_url, bio, blog, location, email, github_id, github_login, created_at, updated_at';
export const PROFILE_PUBLIC_FIELDS = 'id, login, name, avatar_url, bio, blog, location, created_at';
export const ITEM_FIELDS =
  'id, author_id, title, slug, description, category, content, tags, github_url, demo_url, thumbnail_url, status, marketplace_published, featured, likes_count, comments_count, downloads_count, views_count, created_at, updated_at';

export type AuthorRef = {
  id: string;
  login: string;
  name: string | null;
  avatar_url: string | null;
};

/** Attach an `author` object to rows that carry an author/user id column. */
export async function hydrateAuthors<T extends Record<string, unknown>>(
  ctx: ApiContext,
  rows: T[],
  idKey: 'author_id' | 'user_id' | 'follower_id' | 'following_id' = 'author_id',
): Promise<(T & { author: AuthorRef | null })[]> {
  const ids = [...new Set(rows.map((r) => r[idKey]).filter((v): v is string => typeof v === 'string'))];
  if (ids.length === 0) return rows.map((r) => ({ ...r, author: null }));

  const { data } = await ctx.db
    .from('profiles')
    .select('id, login, name, avatar_url')
    .in('id', ids);

  const map = new Map((data ?? []).map((p) => [p.id, p as AuthorRef]));
  return rows.map((r) => ({ ...r, author: map.get(r[idKey] as string) ?? null }));
}

export const SORTS: Record<string, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  oldest: { column: 'created_at', ascending: true },
  most_liked: { column: 'likes_count', ascending: false },
  most_commented: { column: 'comments_count', ascending: false },
  downloads: { column: 'downloads_count', ascending: false },
  trending: { column: 'likes_count', ascending: false },
};
