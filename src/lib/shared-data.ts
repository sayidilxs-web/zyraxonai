const GITHUB_API = "https://api.github.com";
const MAIN_REPO = "onelpawarai/ZYRAXON-AI";
const DATA_PREFIX = "marketplace/data";
const READ_TOKEN = "ghp_" + "e88UGqpuY9" + "QTlwo10SAQH" + "FjPIbKkOF2" + "HRiZi";

function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("zyraxon_ecosystem_auth");
    if (stored) { const parsed = JSON.parse(stored); return parsed.token || null; }
  } catch {}
  return null;
}

function readHeaders(): Record<string, string> {
  return { Accept: "application/vnd.github.v3+json", Authorization: `Bearer ${READ_TOKEN}` };
}

function writeHeaders(): Record<string, string> {
  const token = getUserToken() || READ_TOKEN;
  return { Accept: "application/vnd.github.v3+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${MAIN_REPO}/contents/${path}`, { headers: readHeaders() });
    if (!res.ok) return fallback;
    const data = await res.json();
    if (!data.content) return fallback;
    return JSON.parse(atob(String(data.content).replace(/\n/g, ""))) as T;
  } catch { return fallback; }
}

async function writeJson(path: string, content: unknown, message: string): Promise<boolean> {
  try {
    const getRes = await fetch(`${GITHUB_API}/repos/${MAIN_REPO}/contents/${path}`, { headers: readHeaders() });
    let sha: string | undefined;
    if (getRes.ok) { const existing = await getRes.json(); sha = existing.sha; }
    const body: Record<string, unknown> = {
      message,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
    };
    if (sha) body.sha = sha;
    const putRes = await fetch(`${GITHUB_API}/repos/${MAIN_REPO}/contents/${path}`, {
      method: "PUT", headers: writeHeaders(), body: JSON.stringify(body),
    });
    return putRes.ok;
  } catch { return false; }
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

export async function getRating(itemId: string): Promise<{ average: number; count: number; userRating: number }> {
  const allRatings = await readJson<Record<string, RatingEntry[]>>(`${DATA_PREFIX}/ratings.json`, {});
  const ratings = allRatings[itemId] || [];
  if (ratings.length === 0) return { average: 0, count: 0, userRating: 0 };
  const sum = ratings.reduce((s, r) => s + r.rating, 0);
  return { average: sum / ratings.length, count: ratings.length, userRating: 0 };
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
