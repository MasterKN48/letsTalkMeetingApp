/**
 * Service Worker for Let'sTalk
 * This file is 100% compatible with Turbopack as it lives in /public
 * and does not require any build-time compilation.
 */
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
  console.log('Workbox is loaded');

  // Cache images with a Stale-While-Revalidate strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Cache fonts with a Cache-First strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'webfonts',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
        }),
      ],
    })
  );

  // Cache static assets (JS/CSS) that Next.js doesn't already handle via precache
  workbox.routing.registerRoute(
    ({ request }) => 
      request.destination === 'script' || 
      request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
    })
  );
}
