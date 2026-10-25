"use client";

export default function OfflineNotice({ offline, stale, cachedAt }) {
  const date = cachedAt ? new Date(cachedAt) : null;
  const time = date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  return <div role="status" aria-live="polite" aria-atomic="true" className={offline ? "notice pwa-notice" : undefined}>
    {offline && (stale ? <>Offline — showing data{time ? <> from <time dateTime={date.toISOString()}>{time}</time></> : " saved earlier"}. This may be out of date.</> :
      "The API is unreachable right now — showing demo data.")}
  </div>;
}
