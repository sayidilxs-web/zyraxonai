/**
 * Shared ecosystem data (likes, stars, comments, ratings, downloads).
 * Storage is still GitHub — the JSON files and their shapes are unchanged.
 * Reads/writes now go through /api/public/community-store, which holds the
 * GitHub token server-side (the old in-bundle token was revoked, which is why
 * likes / comments / stars stopped saving).
 */
const STORE = "/api/public/community-store";
const DATA_PREFIX = "marketplace/data";

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${STORE}?file=${encodeURIComponent(file)}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { content?: unknown };
    if (data.content == null) return fallback;
    return data.content as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, content: unknown, message: string): Promise<boolean> {
  try {
    const res = await fetch(STORE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file, content, message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getLikeCount(itemId: string): Promise<number> {
  const data = await readJson<Record<string, number>>(`${DATA_PREFIX}/likes.json`, {});
  return data[itemId] || 0;
}

export async function getUserLikes(userId: string): Promise<string[]> {
  const data = await readJson<Record<string, string[]>>(`${DATA_PREFIX}/user_likes.json`, {});
  return data[userId] || [];
}

export async function toggleLike(itemId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  const allLikes = await readJson<Record<string, number>>(`${DATA_PREFIX}/likes.json`, {});
  const userLikes = await readJson<Record<string, string[]>>(`${DATA_PREFIX}/user_likes.json`, {});
  const userArr = userLikes[userId] || [];
  const isLiked = userArr.includes(itemId);
  if (isLiked) {
    userLikes[userId] = userArr.filter((id) => id !== itemId);
    allLikes[itemId] = Math.max(0, (allLikes[itemId] || 1) - 1);
  } else {
    userLikes[userId] = [...userArr, itemId];
    allLikes[itemId] = (allLikes[itemId] || 0) + 1;
  }
  await writeJson(`${DATA_PREFIX}/likes.json`, allLikes, `Like ${itemId}`);
  await writeJson(`${DATA_PREFIX}/user_likes.json`, userLikes, `User like ${userId}`);
  return { liked: !isLiked, count: allLikes[itemId] || 0 };
}

export interface SharedComment {
  id?: string;
  itemId: string;
  userId?: string;
  username?: string;
  content: string;
  createdAt?: string;
  [key: string]: unknown;
}

export async function getComments(itemId: string): Promise<SharedComment[]> {
  const data = await readJson<Record<string, SharedComment[]>>(`${DATA_PREFIX}/comments.json`, {});
  return data[itemId] || [];
}

export async function addComment(comment: SharedComment): Promise<void> {
  const all = await readJson<Record<string, SharedComment[]>>(`${DATA_PREFIX}/comments.json`, {});
  const itemComments = all[comment.itemId] || [];
  itemComments.push(comment);
  all[comment.itemId] = itemComments.slice(-200);
  await writeJson(`${DATA_PREFIX}/comments.json`, all, `Comment on ${comment.itemId}`);
}

interface RatingEntry { userId: string; rating: number; createdAt: string }

export async function getRating(itemId: string, userId?: string): Promise<{ average: number; count: number; userRating: number }> {
  const allRatings = await readJson<Record<string, RatingEntry[]>>(`${DATA_PREFIX}/ratings.json`, {});
  const ratings = allRatings[itemId] || [];
  if (ratings.length === 0) return { average: 0, count: 0, userRating: 0 };
  const sum = ratings.reduce((s, r) => s + r.rating, 0);
  const mine = userId ? ratings.find((r) => r.userId === userId)?.rating || 0 : 0;
  return { average: sum / ratings.length, count: ratings.length, userRating: mine };
}

export async function setRating(itemId: string, userId: string, rating: number): Promise<{ average: number; count: number }> {
  const allRatings = await readJson<Record<string, RatingEntry[]>>(`${DATA_PREFIX}/ratings.json`, {});
  const itemRatings = allRatings[itemId] || [];
  const existing = itemRatings.findIndex((r) => r.userId === userId);
  if (existing >= 0) { itemRatings[existing].rating = rating; }
  else { itemRatings.push({ userId, rating, createdAt: new Date().toISOString() }); }
  allRatings[itemId] = itemRatings;
  await writeJson(`${DATA_PREFIX}/ratings.json`, allRatings, `Rate ${itemId}`);
  const sum = itemRatings.reduce((s, r) => s + r.rating, 0);
  return { average: sum / itemRatings.length, count: itemRatings.length };
}

export async function getStarCount(itemId: string): Promise<number> {
  const data = await readJson<Record<string, string[]>>(`${DATA_PREFIX}/stars.json`, {});
  return (data[itemId] || []).length;
}

export async function toggleStar(itemId: string, userId: string): Promise<{ starred: boolean; count: number }> {
  const data = await readJson<Record<string, string[]>>(`${DATA_PREFIX}/stars.json`, {});
  const arr = data[itemId] || [];
  const starred = arr.includes(userId);
  data[itemId] = starred ? arr.filter((id) => id !== userId) : [...arr, userId];
  await writeJson(`${DATA_PREFIX}/stars.json`, data, `Star ${itemId}`);
  return { starred: !starred, count: data[itemId].length };
}

export async function incrementDownload(itemId: string): Promise<number> {
  const data = await readJson<Record<string, number>>(`${DATA_PREFIX}/downloads.json`, {});
  data[itemId] = (data[itemId] || 0) + 1;
  await writeJson(`${DATA_PREFIX}/downloads.json`, data, `Download ${itemId}`);
  return data[itemId];
}

export async function getDownloadCount(itemId: string): Promise<number> {
  const data = await readJson<Record<string, number>>(`${DATA_PREFIX}/downloads.json`, {});
  return data[itemId] || 0;
}

export async function recordShare(itemId: string, userId: string): Promise<number> {
  const data = await readJson<Record<string, number>>(`${DATA_PREFIX}/shares.json`, {});
  data[itemId] = (data[itemId] || 0) + 1;
  await writeJson(`${DATA_PREFIX}/shares.json`, data, `Share ${itemId} by ${userId}`);
  return data[itemId];
}
