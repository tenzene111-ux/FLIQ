"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FliqLogo } from "@/components/ui/FliqLogo";
import { Button } from "@/components/ui/Button";
import { Bell, Heart, MessageCircle, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingNotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function finish(enable: boolean) {
    setLoading(true);
    try {
      if (enable) {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pushLikes: true, pushComments: true, pushFollowers: true, pushMentions: true, pushMessages: true }),
        });
        if (typeof window !== "undefined" && "Notification" in window) {
          try {
            await Notification.requestPermission();
          } catch {
            // ignore — unsupported or blocked, settings still saved server-side
          }
        }
      }
      router.push("/home");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md flex flex-col flex-1">
        <div className="flex justify-center mb-6">
          <FliqLogo />
        </div>

        <div className="flex items-center gap-1.5 mb-6 justify-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all", i === 2 ? "w-8 bg-gradient-brand-horizontal" : "w-4 bg-surface-3")} />
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-brand-diag flex items-center justify-center shadow-[0_8px_40px_-8px_rgba(217,70,239,0.6)]">
              <Bell size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Never miss a moment</h1>
          <p className="text-muted text-sm mt-2 max-w-xs">
            Turn on notifications to know when someone likes, comments, follows, or messages you.
          </p>

          <div className="flex flex-col gap-2.5 mt-6 w-full">
            {[
              { icon: Heart, text: "Likes on your videos" },
              { icon: MessageCircle, text: "New comments & messages" },
              { icon: UserPlus, text: "New followers" },
            ].map((item) => (
              <div key={item.text} className="glass rounded-xl px-4 py-3 flex items-center gap-3 text-left">
                <item.icon size={18} className="text-fliq-cyan shrink-0" />
                <span className="text-sm text-white">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-8 flex flex-col gap-3">
          <Button size="lg" fullWidth loading={loading} onClick={() => finish(true)}>
            Enable notifications
          </Button>
          <Button size="lg" variant="ghost" fullWidth onClick={() => finish(false)}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
