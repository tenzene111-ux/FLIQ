"use client";

import { useEffect, useState } from "react";

export type ConnectionQuality = "excellent" | "good" | "weak" | "offline";

interface NetworkInformation extends EventTarget {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
}

function readQuality(): ConnectionQuality {
  if (typeof navigator === "undefined") return "good";
  if (!navigator.onLine) return "offline";
  const nav = navigator as Navigator & { connection?: NetworkInformation };
  const conn = nav.connection;
  if (!conn?.effectiveType) return "good"; // browser doesn't expose Network Information API — assume fine
  if (conn.effectiveType === "4g" && (conn.downlink ?? 0) >= 4) return "excellent";
  if (conn.effectiveType === "4g") return "good";
  return "weak";
}

/**
 * A client-side estimate of network quality, from the browser's Network
 * Information API (effectiveType/downlink) where available. This is not a
 * measurement of real streaming ingest health — there's no media server to
 * measure — it's an honest best-effort signal shown to the creator before
 * going live, matching what the browser itself can see.
 */
export function useConnectionQuality(): ConnectionQuality {
  const [quality, setQuality] = useState<ConnectionQuality>(readQuality);

  useEffect(() => {
    const update = () => setQuality(readQuality());
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const nav = navigator as Navigator & { connection?: NetworkInformation };
    nav.connection?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      nav.connection?.removeEventListener?.("change", update);
    };
  }, []);

  return quality;
}
