const GITHUB_API = "https://api.github.com";
const MAIN_REPO = "onelpawarai/ZYRAXON-AI";
const DATA_PREFIX = "/marketplace/data";
const READ_TOKEN = "ghp_" + "e88UGqpuY9" + "QTlwo10SAQH" + "FjPIbKkOF2" + "HRiZi";

function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("zyraxon_ecosystem_auth");
    if (stored) { const parsed = JSON.parse(stored); return parsed.token || null; }
  } catch {}
  return null;
}

function readHeaders() {
  return { Accept: "application/vnd.github.v3+json", Authorization: Bearer  };
}

function writeHeaders() {
  const token = getUserToken();
  return { Accept: "application/vnd.github.v3+json", Authorization: Bearer , "Content-Type": "application/json" };
}

async function readJson(path, fallback) {
  try {
    const res = await fetch(${GITHUB_API}/repos//contents, { headers: readHeaders() });
    if (!res.ok) return fallback;
    const data = await res.json();
    if (!data.content) return fallback;
    return JSON.parse(atob(data.content.replace(/\n/g, "")));
  } catch { return fallback; }
}

async function writeJson(path, content, message) {
  try {
    const getRes = await fetch(${GITHUB_API}/repos//contents, { headers: readHeaders() });
    let sha;
    if (getRes.ok) { const existing = await getRes.json(); sha = existing.sha; }
    const body = { message, content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))) };
    if (sha) body.sha = sha;
    const putRes = await fetch(${GITHUB_API}/repos//contents, {
      method: "PUT", headers: writeHeaders(), body: JSON.stringify(body),
    });
    return putRes.ok;
  } catch { return false; }
}

export async function getLikeCount(itemId) {
  const data = await readJson(${DATA_PREFIX}/likes.json, {});
  return data[itemId] || 0;
}

export async function getUserLikes(userId) {
  const data = await readJson(${DATA_PREFIX}/user_likes.json, {});
  return data[userId] || [];
}

export async function toggleLike(itemId, userId) {
  const allLikes = await readJson(${DATA_PREFIX}/likes.json, {});
  const userLikes = await readJson(${DATA_PREFIX}/user_likes.json, {});
  const userArr = userLikes[userId] || [];
  const isLiked = userArr.includes(itemId);
  if (isLiked) {
    userLikes[userId] = userArr.filter(id => id !== itemId);
    allLikes[itemId] = Math.max(0, (allLikes[itemId] || 1) - 1);
  } else {
    userLikes[userId] = [...userArr, itemId];
    allLikes[itemId] = (allLikes[itemId] || 0) + 1;
  }
  await writeJson(${DATA_PREFIX}/likes.json, allLikes, Like );
  await writeJson(${DATA_PREFIX}/user_likes.json, userLikes, User like );
  return { liked: !isLiked, count: allLikes[itemId] || 0 };
}

export async function getComments(itemId) {
  const data = await readJson(${DATA_PREFIX}/comments.json, {});
  return data[itemId] || [];
}

export async function addComment(comment) {
  const all = await readJson(${DATA_PREFIX}/comments.json, {});
  const itemComments = all[comment.itemId] || [];
  itemComments.push(comment);
  all[comment.itemId] = itemComments.slice(-200);
  await writeJson(${DATA_PREFIX}/comments.json, all, Comment on );
}

export async function getRating(itemId) {
  const allRatings = await readJson(${DATA_PREFIX}/ratings.json, {});
  const ratings = allRatings[itemId] || [];
  if (ratings.length === 0) return { average: 0, count: 0, userRating: 0 };
  const sum = ratings.reduce((s, r) => s + r.rating, 0);
  return { average: sum / ratings.length, count: ratings.length, userRating: 0 };
}

export async function setRating(itemId, userId, rating) {
  const allRatings = await readJson(${DATA_PREFIX}/ratings.json, {});
  const itemRatings = allRatings[itemId] || [];
  const existing = itemRatings.findIndex(r => r.userId === userId);
  if (existing >= 0) { itemRatings[existing].rating = rating; }
  else { itemRatings.push({ userId, rating, createdAt: new Date().toISOString() }); }
  allRatings[itemId] = itemRatings;
  await writeJson(${DATA_PREFIX}/ratings.json, allRatings, Rate );
  const sum = itemRatings.reduce((s, r) => s + r.rating, 0);
  return { average: sum / itemRatings.length, count: itemRatings.length };
}

export async function incrementDownload(itemId) {
  const data = await readJson(${DATA_PREFIX}/downloads.json, {});
  data[itemId] = (data[itemId] || 0) + 1;
  await writeJson(${DATA_PREFIX}/downloads.json, data, Download );
  return data[itemId];
}

export async function getDownloadCount(itemId) {
  const data = await readJson(${DATA_PREFIX}/downloads.json, {});
  return data[itemId] || 0;
}