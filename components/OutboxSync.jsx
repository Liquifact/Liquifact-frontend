"use client";

import { useEffect, useRef } from "react";
import { createInvoice } from "@/lib/api";
import { createOutbox } from "@/lib/outbox";
import { useOptionalToast } from "@/components/toast/ToastProvider";

export default function OutboxSync() {
  const toast = useOptionalToast();
  const flushingRef = useRef(false);

  useEffect(() => {
    const outbox = createOutbox(window.localStorage);

    async function sync() {
      if (flushingRef.current) return;
      if (outbox.list().length === 0) return;
      flushingRef.current = true;
      try {
        const { delivered, dropped } = await outbox.flush((item) =>
          createInvoice(item.payload, { idempotencyKey: item.idempotencyKey })
        );
        for (const { result } of delivered) {
          const id = result?.data?.id;
          toast?.push({
            kind: "success",
            title: "Queued invoice submitted",
            description: id ? `Invoice ${id} was delivered.` : "Your offline invoice was delivered.",
          });
        }
        for (const { error } of dropped) {
          toast?.push({
            kind: "error",
            title: "Queued invoice dropped",
            description: error?.message || "The server rejected the queued invoice.",
          });
        }
      } finally {
        flushingRef.current = false;
      }
    }

    const onOnline = () => {
      sync();
    };

    window.addEventListener("online", onOnline);
    if (navigator.onLine) {
      sync();
    }

    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [toast]);

  return null;
}
