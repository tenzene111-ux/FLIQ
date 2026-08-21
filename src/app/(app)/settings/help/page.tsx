"use client";

import { useState } from "react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Input } from "@/components/ui/Input";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  { q: "How do I post a video?", a: "Tap the + button in the navigation bar, record or upload a clip, edit it, then tap Post to Fliq." },
  { q: "How do I make my account private?", a: "Go to Settings → Privacy and turn on Private account. Only approved followers will see your videos." },
  { q: "How do I recover my password?", a: "On the login screen, tap 'Forgot password?' and follow the instructions sent to your email." },
  { q: "Why can't I see videos from someone I follow?", a: "They may have set that video's visibility to Followers only or Only me, or removed it." },
  { q: "How do I report a video or user?", a: "Tap the ⋯ menu on a video or profile and choose Report, then select a reason." },
  { q: "How do I delete my account?", a: "Go to Settings → Delete Account. This permanently removes your videos, messages and data." },
  { q: "Can I download videos?", a: "If the creator has allowed downloads, you'll see a download option in the share sheet." },
  { q: "How does the For You feed work?", a: "It ranks videos using your interests, watch history, and how people engage with each video." },
];

export default function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const filtered = FAQS.filter((f) => f.q.toLowerCase().includes(query.toLowerCase()));

  return (
    <SettingsSubpage title="Help Center">
      <div className="px-4">
        <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 mb-4">
          <Search size={16} className="text-muted-2" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help articles" className="border-none bg-transparent px-1" />
        </div>

        <div className="flex flex-col divide-y divide-border">
          {filtered.map((f, i) => (
            <div key={f.q}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between py-3.5 text-left">
                <span className="text-white text-sm font-medium pr-3">{f.q}</span>
                <ChevronDown size={16} className={cn("text-muted-2 shrink-0 transition-transform", open === i && "rotate-180")} />
              </button>
              {open === i && <p className="text-muted text-sm pb-3.5 pr-6">{f.a}</p>}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-muted text-sm py-6 text-center">No articles match your search.</p>}
        </div>
      </div>
    </SettingsSubpage>
  );
}
