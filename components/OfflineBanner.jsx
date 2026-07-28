"use client";

import { useEffect, useRef } from "react";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";
import { useToast } from "./ToastProvider";
import { copy } from "@/app/copy/en";

export default function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const prevOnlineRef = useRef(isOnline);
  const toast = useToast();

  useEffect(() => {
    const wasOffline = prevOnlineRef.current === false;
    prevOnlineRef.current = isOnline;

    if (isOnline && wasOffline) {
      toast.success(copy.network.reconnectedMsg, copy.network.reconnectedTitle);
    }
  }, [isOnline, toast]);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-3 text-sm font-medium text-amber-200 shadow-sm backdrop-blur-sm border-b border-amber-500/20"
    >
      <span aria-hidden="true" className="text-base">&#9888;</span>
      <span>{copy.network.offlineBanner}</span>
    </div>
  );
}
