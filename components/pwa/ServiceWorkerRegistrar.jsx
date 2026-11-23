"use client";

import { useEffect, useRef, useState } from "react";

/** Minimum gap between registration.update() calls. */
export const UPDATE_THROTTLE_MS = 5 * 60 * 1000;
/** Periodic update check cadence while the tab is visible. */
export const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

export default function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState(null);
  const [error, setError] = useState(false);
  const accepted = useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator) ||
      !(location.protocol === "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname))) return;
    let alive = true;
    let registration;
    let installing;
    const stateChanged = () => {
      if (alive && installing?.state === "installed" && navigator.serviceWorker.controller) setWaiting(registration.waiting);
    };
    const updateFound = () => {
      installing?.removeEventListener("statechange", stateChanged);
      installing = registration.installing;
      installing?.addEventListener("statechange", stateChanged);
    };
    const changed = () => { if (accepted.current) location.reload(); };
    // Long-lived (installed PWA) sessions rarely navigate, so ask the browser to
    // re-fetch /sw.js when the tab comes back and periodically while visible.
    let lastCheck = 0;
    let timer;
    const checkForUpdate = () => {
      if (!alive || !registration || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastCheck < UPDATE_THROTTLE_MS) return;
      lastCheck = now;
      try {
        Promise.resolve(registration.update()).catch(() => {});
      } catch {
        // Update checks are best-effort; failures (offline, 404) are ignored.
      }
    };
    const visibilityChanged = () => { if (document.visibilityState === "visible") checkForUpdate(); };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    navigator.serviceWorker.register("/sw.js", { scope: "/", type: "module", updateViaCache: "none" })
      .then((reg) => {
        if (!alive) return;
        registration = reg;
        // register() just fetched the worker script, so count it as a check.
        lastCheck = Date.now();
        document.addEventListener("visibilitychange", visibilityChanged);
        timer = setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", updateFound);
        if (reg.installing) updateFound();
      }).catch(() => { if (alive) setError(true); });
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
      registration?.removeEventListener("updatefound", updateFound);
      installing?.removeEventListener("statechange", stateChanged);
    };
  }, []);

  return (
    <aside className="pwa-status" aria-label="Offline app status">
      <div role="status" aria-live="polite" aria-atomic="true">
        {waiting ? "Update available — Reload when you are ready. Save any unfinished work first." :
          error ? "Offline access could not be enabled. You can keep using the app online." : ""}
      </div>
      {waiting && <button className="btn btn-ghost" type="button" onClick={() => {
        accepted.current = true;
        waiting.postMessage({ type: "SKIP_WAITING" });
      }}>Reload</button>}
    </aside>
  );
}
