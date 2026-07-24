// ═══════════════════════════════════════════════
// ZYRAXON AI — Firebase Cloud Messaging Service Worker
// Handles push notifications in background
// ═══════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBtp5tzBPw7NzFZRdcmtOiWARWmNl-EnWw",
  authDomain: "lx-pdf-library.firebaseapp.com",
  projectId: "lx-pdf-library",
  storageBucket: "lx-pdf-library.firebasestorage.app",
  messagingSenderId: "313164641962",
  appId: "1:313164641962:web:1ba5f10d17289f053502d3",
  measurementId: "G-CYBQLBQ3HV"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);

  const notificationTitle = payload.notification?.title || 'ZYRAXON AI';
  const notificationBody = payload.notification?.body || 'New update available';
  const notificationIcon = payload.notification?.icon || '/favicon.ico';
  const notificationUrl = payload.data?.url || 'https://sayidilxs-web.github.io/zyraxonai/';

  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: notificationIcon,
    tag: payload.data?.tag || 'zyraxon-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: notificationUrl },
    actions: [
      { action: 'open', title: 'Open ZYRAXON' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || 'https://sayidilxs-web.github.io/zyraxonai/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If already open, focus it
      for (const client of clientList) {
        if (client.url.includes('zyraxonai') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event.notification.tag);
});
