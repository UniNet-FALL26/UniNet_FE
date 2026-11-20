/* Firebase configuration here is public app metadata, supplied by the registered worker URL. */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const payload = event.notification.data;
  if (!payload || !/^[a-f0-9-]{36}$/i.test(payload.conversationId) || !/^[a-f0-9-]{36}$/i.test(payload.messageId)) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.focus(); existing.postMessage({ kind: 'chat-notification-open', payload }); }
    else await self.clients.openWindow(`/messages?conversationId=${encodeURIComponent(payload.conversationId)}&messageId=${encodeURIComponent(payload.messageId)}&fromPush=1`);
  })());
});

function remember(id) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('uninet-chat-push', 1);
    open.onupgradeneeded = () => { const store = open.result.createObjectStore('messages', { keyPath: 'id' }); store.createIndex('createdAt', 'createdAt'); };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result; const tx = db.transaction('messages', 'readwrite'); const store = tx.objectStore('messages'); let fresh = false;
      const get = store.get(id); get.onsuccess = () => { if (!get.result) { fresh = true; store.put({ id, createdAt: Date.now() }); } };
      const count = store.count(); count.onsuccess = () => { if (count.result > 1000) { let left = count.result - 800; const cursor = store.index('createdAt').openCursor(); cursor.onsuccess = () => { if (left-- > 0 && cursor.result) { cursor.result.delete(); cursor.result.continue(); } }; } };
      tx.oncomplete = () => { db.close(); resolve(fresh); }; tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}

const config = JSON.parse(new URL(self.location.href).searchParams.get('config') || 'null');
if (config?.projectId && config?.messagingSenderId && config?.appId && config?.apiKey) {
  importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');
  firebase.initializeApp(config);
  firebase.messaging().onBackgroundMessage(async remote => {
    const data = remote.data;
    if (data?.type !== 'chat_message' || !/^[a-f0-9-]{36}$/i.test(data.messageId) || !/^[a-f0-9-]{36}$/i.test(data.conversationId)) return;
    if (!await remember(data.messageId)) return;
    const body = String(data.conversationType) === '1' ? `${data.senderName}: ${data.messagePreview}` : data.messagePreview;
    await self.registration.showNotification(data.conversationName || data.senderName || 'UniNet', { body: body || 'Bạn có tin nhắn mới.', icon: '/notification-icon.png', badge: '/notification-badge.png', tag: data.messageId, data, renotify: false });
  });
}
