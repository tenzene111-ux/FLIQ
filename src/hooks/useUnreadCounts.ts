"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";

export function useUnreadCounts() {
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState(0);
  const [messages, setMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/unread-counts", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setNotifications(data.notifications ?? 0);
          setMessages(data.messages ?? 0);
        }
      } catch {
        // silent — badge counts are non-critical, next poll will retry
      }
    }

    poll();
    const interval = setInterval(poll, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  return { notifications, messages };
}
