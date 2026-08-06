// ═══════════════════════════════════════════════
// ZYRAXON AI — Firebase Cloud Functions
// Push notifications + Marketplace API
// ═══════════════════════════════════════════════

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ═══════════════════════════════════════════════
// MARKETPLACE API — GitHub-backed, serverless
// ═══════════════════════════════════════════════

const GITHUB_API = "https://api.github.com";
const MAIN_REPO = "onelpawarai/ZYRAXON-AI";
const MAIN_TOKEN = process.env.ZYRAXON_MAIN_TOKEN || "";

let cachedItems = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

async function fetchMarketplaceItems() {
  const now = Date.now();
  if (cachedItems && now - cacheTime < CACHE_TTL) return cachedItems;
  const items = [];
  const paths = [
    "marketplace/published/index.json",
    "marketplace/plugins/index.json",
    "marketplace/bots/index.json",
    "marketplace/templates/index.json",
  ];
  for (const path of paths) {
    try {
      const response = await fetch(`${GITHUB_API}/repos/${MAIN_REPO}/contents/${path}`, {
        headers: { Accept: "application/vnd.github.v3+json", Authorization: `Bearer ${MAIN_TOKEN}` },
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data.content) {
        const decoded = JSON.parse(Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8"));
        if (Array.isArray(decoded)) items.push(...decoded);
      }
    } catch (e) { console.error(`[API] ${path}:`, e.message); }
  }
  const seen = new Set();
  cachedItems = items.filter((item) => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
  cacheTime = now;
  return cachedItems;
}

function cors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ═══ GET /api/marketplace/search ═══
exports.marketplaceSearch = onRequest({ memory: "256MiB" }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const { q, category, type, tags, limit = 20, offset = 0, sort = "newest" } = req.query;
    let items = await fetchMarketplaceItems();
    if (q) { const query = q.toLowerCase(); items = items.filter((i) => i.name.toLowerCase().includes(query) || i.description.toLowerCase().includes(query) || (i.tags && i.tags.some((t) => t.toLowerCase().includes(query)))); }
    if (category) items = items.filter((i) => i.category === category);
    if (type) items = items.filter((i) => i.type === type);
    if (tags) { const tl = tags.split(","); items = items.filter((i) => tl.some((t) => i.tags && i.tags.includes(t.trim()))); }
    switch (sort) { case "popular": case "downloads": items.sort((a, b) => (b.downloads||0) - (a.downloads||0)); break; case "rating": items.sort((a, b) => (b.rating||0) - (a.rating||0)); break; default: items.sort((a, b) => new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime()); }
    const total = items.length;
    items = items.slice(Number(offset), Number(offset) + Number(limit));
    return res.status(200).json({ success: true, data: items, total, timestamp: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// ═══ GET /api/marketplace/item/:id ═══
exports.marketplaceItem = onRequest({ memory: "256MiB" }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const items = await fetchMarketplaceItems();
    const item = items.find((i) => i.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, error: "Item not found" });
    return res.status(200).json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// ═══ GET /api/marketplace/categories ═══
exports.marketplaceCategories = onRequest({ memory: "256MiB" }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const items = await fetchMarketplaceItems();
    const cm = {}; items.forEach((i) => { cm[i.category] = (cm[i.category] || 0) + 1; });
    const categories = Object.entries(cm).map(([id, count]) => ({ id, name: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), count }));
    return res.status(200).json({ success: true, data: categories, timestamp: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// ═══ GET /api/marketplace/featured ═══
exports.marketplaceFeatured = onRequest({ memory: "256MiB" }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const items = await fetchMarketplaceItems();
    const featured = items.filter((i) => i.featured || (i.downloads||0) > 100 || (i.rating||0) >= 4.5).sort((a, b) => (b.downloads||0) - (a.downloads||0)).slice(0, 20);
    return res.status(200).json({ success: true, data: featured, timestamp: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// ═══ GET /api/marketplace/stats ═══
exports.marketplaceStats = onRequest({ memory: "256MiB" }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const items = await fetchMarketplaceItems();
    const ua = new Set(items.map((i) => i.authorId || i.author));
    return res.status(200).json({ success: true, data: { totalItems: items.length, totalDownloads: items.reduce((s, i) => s + (i.downloads||0), 0), totalUsers: ua.size, categories: new Set(items.map((i) => i.category)).size }, timestamp: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// ═══ GET /api/marketplace/download/:id ═══
exports.marketplaceDownload = onRequest({ memory: "256MiB" }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const items = await fetchMarketplaceItems();
    const item = items.find((i) => i.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, error: "Item not found" });
    const url = item.downloadUrl || item.githubRepo || item.repository || "";
    const fileName = url.split("/").pop().split("?")[0] || `${item.name}.zip`;
    return res.status(200).json({ success: true, data: { downloadUrl: url, fileName, fileSize: item.fileSize, name: item.name }, timestamp: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// ═══ POST /api/marketplace/install ═══
exports.marketplaceInstall = onRequest({ memory: "256MiB" }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { itemId, action = "download" } = req.body;
    if (!itemId) return res.status(400).json({ success: false, error: "itemId required" });
    const items = await fetchMarketplaceItems();
    const item = items.find((i) => i.id === itemId);
    if (!item) return res.status(404).json({ success: false, error: "Item not found" });
    let result = {};
    switch (action) {
      case "download": result = { action: "download", url: item.downloadUrl, message: `Download ${item.name}` }; break;
      case "import": result = { action: "import", command: item.installCommand, message: `Run: ${item.installCommand}` }; break;
      case "clone": result = { action: "clone", command: `git clone ${item.githubRepo||item.repository}`, url: item.githubRepo||item.repository }; break;
      case "link": result = { action: "link", url: item.liveDemo, message: `Visit ${item.liveDemo}` }; break;
      default: result = { action: "info", message: item.description, url: item.githubRepo||item.repository };
    }
    return res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// ═══ POST /api/auth/verify ═══
exports.authVerify = onRequest({ memory: "256MiB" }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: "token required" });
    const response = await fetch(`${GITHUB_API}/user`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" } });
    if (!response.ok) return res.status(200).json({ success: true, data: { valid: false }, timestamp: new Date().toISOString() });
    const user = await response.json();
    return res.status(200).json({ success: true, data: { valid: true, username: user.login, userId: `user-${user.id}`, avatarUrl: user.avatar_url }, timestamp: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// ═══ GET /api/marketplace/remix/:id ═══
exports.marketplaceRemix = onRequest({ memory: "256MiB" }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const items = await fetchMarketplaceItems();
    const item = items.find((i) => i.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, error: "Item not found" });
    const original = item.remixedFrom ? items.find((i) => i.id === item.remixedFrom) : null;
    const remixes = items.filter((i) => i.remixedFrom === req.params.id);
    const chain = []; let current = item;
    while (current) { chain.unshift({ id: current.id, name: current.name, author: current.author }); if (!current.remixedFrom) break; current = items.find((i) => i.id === current.remixedFrom); }
    return res.status(200).json({ success: true, data: { item, original, remixes, chain }, timestamp: new Date().toISOString() });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

// ═══ GET /api/health ═══
exports.apiHealth = onRequest({ memory: "128MiB" }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  return res.status(200).json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
});

// ═══ AUTO-SEND: 10:00 AM (Asia/Dhaka) ═══
exports.scheduledMorning = onSchedule({
  schedule: "0 10 * * *",
  timeZone: "Asia/Dhaka",
  memory: "256MiB",
}, async (event) => {
  console.log("[CRON] Running morning notification...");

  // Get all subscriber tokens
  const tokensSnap = await db.collection("notification_tokens").get();
  const tokens = [];
  tokensSnap.forEach((doc) => {
    const data = doc.data();
    if (data.token) tokens.push(data.token);
  });

  if (tokens.length === 0) {
    console.log("[CRON] No subscribers found. Skipping.");
    return;
  }

  // Get custom morning message or use default
  let message = "Good morning! Check out the latest ZYRAXON AI updates and features.";
  try {
    const settingsDoc = await db.collection("settings").doc("schedule").get();
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      if (settings.morningMessage) message = settings.morningMessage;
    }
  } catch (e) {
    console.log("[CRON] Using default morning message");
  }

  // Send notification
  const payload = {
    notification: {
      title: "ZYRAXON AI - Good Morning",
      body: message,
      icon: "/favicon.ico",
    },
    data: {
      url: "https://sayidilxs-web.github.io/zyraxonai/",
      tag: "zyraxon-morning",
    },
    webpush: {
      notification: {
        title: "ZYRAXON AI - Good Morning",
        body: message,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "zyraxon-morning",
        renotify: true,
        actions: [
          { action: "open", title: "Open ZYRAXON" },
          { action: "dismiss", title: "Dismiss" },
        ],
      },
    },
  };

  // Batch send (FCM allows 500 tokens per request)
  const BATCH_SIZE = 500;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        ...payload,
      });
      successCount += response.successCount;
      failureCount += response.failureCount;

      // Remove invalid tokens
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === "messaging/registration-token-not-registered") {
          // Find and remove invalid token
          const invalidToken = batch[idx];
          db.collection("notification_tokens")
            .where("token", "==", invalidToken)
            .get()
            .then((snap) => {
              snap.forEach((doc) => doc.ref.delete());
            });
        }
      });
    } catch (err) {
      console.error("[CRON] Batch send error:", err);
      failureCount += batch.length;
    }
  }

  console.log(`[CRON] Morning sent: ${successCount} success, ${failureCount} failed`);

  // Log to Firestore
  await db.collection("notification_logs").add({
    type: "morning",
    message: message,
    success: successCount,
    failed: failureCount,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// ═══ AUTO-SEND: 8:00 PM (Asia/Dhaka) ═══
exports.scheduledEvening = onSchedule({
  schedule: "0 20 * * *",
  timeZone: "Asia/Dhaka",
  memory: "256MiB",
}, async (event) => {
  console.log("[CRON] Running evening notification...");

  const tokensSnap = await db.collection("notification_tokens").get();
  const tokens = [];
  tokensSnap.forEach((doc) => {
    const data = doc.data();
    if (data.token) tokens.push(data.token);
  });

  if (tokens.length === 0) {
    console.log("[CRON] No subscribers found. Skipping.");
    return;
  }

  let message = "Evening update: New releases and improvements are live on ZYRAXON AI!";
  try {
    const settingsDoc = await db.collection("settings").doc("schedule").get();
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      if (settings.eveningMessage) message = settings.eveningMessage;
    }
  } catch (e) {
    console.log("[CRON] Using default evening message");
  }

  const payload = {
    notification: {
      title: "ZYRAXON AI - Evening Update",
      body: message,
      icon: "/favicon.ico",
    },
    data: {
      url: "https://sayidilxs-web.github.io/zyraxonai/",
      tag: "zyraxon-evening",
    },
    webpush: {
      notification: {
        title: "ZYRAXON AI - Evening Update",
        body: message,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "zyraxon-evening",
        renotify: true,
        actions: [
          { action: "open", title: "Open ZYRAXON" },
          { action: "dismiss", title: "Dismiss" },
        ],
      },
    },
  };

  const BATCH_SIZE = 500;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        ...payload,
      });
      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === "messaging/registration-token-not-registered") {
          const invalidToken = batch[idx];
          db.collection("notification_tokens")
            .where("token", "==", invalidToken)
            .get()
            .then((snap) => {
              snap.forEach((doc) => doc.ref.delete());
            });
        }
      });
    } catch (err) {
      console.error("[CRON] Batch send error:", err);
      failureCount += batch.length;
    }
  }

  console.log(`[CRON] Evening sent: ${successCount} success, ${failureCount} failed`);

  await db.collection("notification_logs").add({
    type: "evening",
    message: message,
    success: successCount,
    failed: failureCount,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// ═══ HTTP: Send custom notification ═══
exports.sendNotification = onRequest({
  memory: "256MiB",
}, async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, body, url } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "Title and body required" });
  }

  const tokensSnap = await db.collection("notification_tokens").get();
  const tokens = [];
  tokensSnap.forEach((doc) => {
    const data = doc.data();
    if (data.token) tokens.push(data.token);
  });

  if (tokens.length === 0) {
    return res.status(200).json({ message: "No subscribers", sent: 0 });
  }

  const payload = {
    notification: { title, body, icon: "/favicon.ico" },
    data: { url: url || "https://sayidilxs-web.github.io/zyraxonai/" },
    webpush: {
      notification: {
        title, body, icon: "/favicon.ico",
        tag: "zyraxon-custom",
        actions: [{ action: "open", title: "Open ZYRAXON" }],
      },
    },
  };

  let success = 0, failed = 0;
  const BATCH = 500;

  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const resp = await messaging.sendEachForMulticast({ tokens: batch, ...payload });
    success += resp.successCount;
    failed += resp.failureCount;
  }

  await db.collection("notification_logs").add({
    type: "custom", title, message: body, success: success, failed: failed,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.status(200).json({ sent: success, failed: failed });
});

// ═══ HTTP: Save schedule settings ═══
exports.saveSchedule = onRequest({
  memory: "128MiB",
}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { morningMessage, eveningMessage } = req.body;
  await db.collection("settings").doc("schedule").set({
    morningMessage: morningMessage || "Good morning! Check out the latest ZYRAXON AI updates.",
    eveningMessage: eveningMessage || "Evening update: New releases are live on ZYRAXON AI!",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.status(200).json({ message: "Schedule saved" });
});
