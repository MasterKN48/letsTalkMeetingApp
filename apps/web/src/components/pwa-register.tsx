"use client";

import { useEffect } from "react";

/**
 * PWARegister
 * Simple client-side registration of the /sw.js manual service worker
 * No build-time integration required — 100% Turbopack compatible.
 */
export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.error("[PWA] Service Worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
