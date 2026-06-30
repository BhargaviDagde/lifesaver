// Firebase Cloud Messaging Service Worker
// Must be at /firebase-messaging-sw.js (public root)

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDwa6MA2U3NMJ7U7row9lQhiNf1p0bM450",
  authDomain: "lifesaver-501004.firebaseapp.com",
  projectId: "lifesaver-501004",
  storageBucket: "lifesaver-501004.firebasestorage.app",
  messagingSenderId: "989807541983",
  appId: "1:989807541983:web:27b4554391851ce2f8336a",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Life Saver', {
    body: body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: payload.data,
  });
});
