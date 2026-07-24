// ═══════════════════════════════════════════════
// ZYRAXON AI — Firebase Cloud Functions
// Auto-scheduled push notifications (10AM & 8PM)
// ═══════════════════════════════════════════════

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

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
