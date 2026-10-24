"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getHealth, getStats } from "@/lib/api";
import { bpsToPercent } from "@/lib/format";
import { formatAmount } from "@/lib/format";

export default function LiveStats() {
  const [stats, setStats] = useState(null);
  const [online, setOnline] = useState(null);

  useEffect(() => {
    let alive = true;
    getHealth().then(() => alive && setOnline(true)).catch(() => alive && setOnline(false));
    getStats().then((s) => alive && setStats(s)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const items = [
    { label: "Invoices listed", value: stats ? stats.invoices : "—" },
    { label: "Open for funding", value: stats ? stats.open : "—" },
    { label: "Face value (all)", value: stats ? formatAmount(stats.totalFaceValue) : "—" },
    { label: "Average yield", value: stats ? bpsToPercent(stats.averageYieldBps) : "—" },
  ];

  return (
    <div>
      <div className="grid grid-4">
        {items.map((i) => (
          <div className="card" key={i.label}>
            <div className="stat">{i.value}</div>
            <div className="stat-label">{i.label}</div>
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 14, fontSize: "0.88rem" }}>
        API status:{" "}
        {online === null ? (
          "checking…"
        ) : online ? (
          <strong style={{ color: "var(--ok)" }}>online</strong>
        ) : (
          <strong style={{ color: "var(--danger)" }}>unreachable</strong>
        )}
      </p>
      <p style={{ marginTop: 8 }}>
        <Link href="/analytics">See market analytics →</Link>
      </p>
    </div>
  );
}
