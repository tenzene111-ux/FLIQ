"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Video as VideoIcon, Camera, Radio } from "lucide-react";
import { trackCreateEvent } from "@/lib/create-events";

function CreateHomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackCreateEvent("CREATE_OPENED");
  }, []);

  useEffect(() => {
    // A sound was picked from the sound library ("Use Sound") — that only
    // makes sense for a video, so skip the chooser and go straight there.
    const soundId = searchParams.get("soundId");
    if (soundId) {
      router.replace(`/create/video?${searchParams.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (searchParams.get("soundId")) return null;

  function choose(type: "video" | "photo" | "live") {
    trackCreateEvent(type === "video" ? "CREATE_VIDEO_SELECTED" : type === "photo" ? "CREATE_PHOTO_SELECTED" : "CREATE_LIVE_SELECTED");
    router.push(type === "video" ? "/create/video" : type === "photo" ? "/create/photos" : "/live/start");
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),16px)] pb-2">
        <span className="w-9" />
        <h1 className="text-white font-bold text-lg">Create</h1>
        <button onClick={() => router.push("/home")} aria-label="Close" className="w-9 h-9 flex items-center justify-center text-white">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 pb-16">
        <p className="text-muted text-sm mb-2">What do you want to create?</p>

        <CreateOption icon={VideoIcon} title="Video" subtitle="Record a new video or upload existing clips" cta="Record" onClick={() => choose("video")} />
        <CreateOption icon={Camera} title="Photo" subtitle="Take a photo or select images from your gallery" cta="Create" onClick={() => choose("photo")} />
        <CreateOption icon={Radio} title="LIVE" subtitle="Start a live broadcast for your followers" cta="Go LIVE" onClick={() => choose("live")} danger />
      </div>
    </div>
  );
}

export default function CreateHomePage() {
  return (
    <Suspense fallback={null}>
      <CreateHomeInner />
    </Suspense>
  );
}

function CreateOption({
  icon: Icon,
  title,
  subtitle,
  cta,
  danger,
  onClick,
}: {
  icon: typeof VideoIcon;
  title: string;
  subtitle: string;
  cta: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 hover:bg-surface-3 transition-colors px-5 py-5 flex items-center gap-4 text-left"
    >
      <span className={danger ? "w-14 h-14 rounded-2xl bg-danger/15 flex items-center justify-center text-danger shrink-0" : "w-14 h-14 rounded-2xl bg-gradient-brand-soft flex items-center justify-center text-fliq-cyan shrink-0"}>
        <Icon size={26} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-base">{title}</p>
        <p className="text-muted-2 text-xs mt-0.5">{subtitle}</p>
      </div>
      <span className={danger ? "text-danger text-sm font-semibold shrink-0" : "text-fliq-cyan text-sm font-semibold shrink-0"}>{cta}</span>
    </button>
  );
}
