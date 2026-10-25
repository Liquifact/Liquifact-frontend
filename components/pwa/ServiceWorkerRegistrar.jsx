"use client";

import { useEffect, useRef, useState } from "react";

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
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    navigator.serviceWorker.register("/sw.js", { scope: "/", type: "module", updateViaCache: "none" })
      .then((reg) => {
        if (!alive) return;
        registration = reg;
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", updateFound);
        if (reg.installing) updateFound();
      }).catch(() => { if (alive) setError(true); });
    return () => {
      alive = false;
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
