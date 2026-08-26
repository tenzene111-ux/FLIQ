"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, RefreshCw, Zap, ZapOff, Mic, Gift, CalendarClock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { CATEGORIES, type CategorySlug } from "@/lib/constants";
import { useCameraRecorder } from "@/hooks/useCameraRecorder";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { toast } from "@/store/toast";
import { trackCreateEvent } from "@/lib/create-events";
import { cn } from "@/lib/utils";

export default function StartLivePage() {
  const router = useRouter();
  const cam = useCameraRecorder();
  const { videoRef, error: camError, facing, flip, torchSupported, torchOn, toggleTorch } = cam;
  const quality = useConnectionQuality();

  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategorySlug>(CATEGORIES[0].slug);
  const [commentsOn, setCommentsOn] = useState(true);
  const [giftsEnabled, setGiftsEnabled] = useState(false);
  const [guestsEnabled, setGuestsEnabled] = useState(false);
  const [maxGuests, setMaxGuests] = useState(3);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackCreateEvent("LIVE_SETUP_OPENED");
  }, []);

  async function handleStart() {
    if (!title.trim()) {
      toast("error", "Give your live a title");
      return;
    }
    let scheduledFor: string | undefined;
    if (mode === "schedule") {
      if (!scheduleDate || !scheduleTime) {
        toast("error", "Pick a date and time");
        return;
      }
      const when = new Date(`${scheduleDate}T${scheduleTime}`);
      if (when.getTime() <= Date.now()) {
        toast("error", "Pick a time in the future");
        return;
      }
      scheduledFor = when.toISOString();
    }

    setLoading(true);
    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          commentsOn,
          giftsEnabled,
          guestsEnabled,
          maxGuests,
          scheduledFor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (scheduledFor) {
        toast("success", "Live scheduled");
        router.push("/live?tab=scheduled");
      } else {
        router.push(`/live/${data.stream.id}`);
      }
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't start live");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer className="max-w-lg mx-auto w-full safe-top">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => router.back()} className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold">Go Live</h1>
      </div>

      <div className="flex items-center gap-1.5 px-4 pb-4">
        <button
          onClick={() => setMode("now")}
          className={cn("flex-1 py-2 rounded-full text-sm font-semibold border", mode === "now" ? "bg-white text-black border-white" : "border-border text-white")}
        >
          Go live now
        </button>
        <button
          onClick={() => setMode("schedule")}
          className={cn(
            "flex-1 py-2 rounded-full text-sm font-semibold border flex items-center justify-center gap-1.5",
            mode === "schedule" ? "bg-white text-black border-white" : "border-border text-white"
          )}
        >
          <CalendarClock size={14} /> Schedule
        </button>
      </div>

      {mode === "now" && (
        <div className="px-4 pb-4">
          <div className="relative aspect-[9/13] rounded-2xl overflow-hidden bg-black">
            {camError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                <AlertTriangle size={22} className="text-warning" />
                <p className="text-white text-xs">{camError}</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
              />
            )}

            <div className="absolute top-2.5 left-2.5">
              <ConnectionBadge quality={quality} />
            </div>

            <div className="absolute top-2.5 right-2.5 flex flex-col gap-2">
              <RoundButton icon={RefreshCw} onClick={flip} label="Switch camera" />
              {torchSupported && <RoundButton icon={torchOn ? ZapOff : Zap} onClick={toggleTorch} label="Toggle flash" />}
              <RoundButton icon={Mic} onClick={() => {}} label="Microphone on" active />
            </div>

            {quality === "weak" && (
              <div className="absolute bottom-2.5 inset-x-2.5 bg-warning/15 border border-warning/40 rounded-xl px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                <p className="text-warning text-[11px] leading-snug">
                  Weak connection. Try moving to a better network before starting LIVE.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 flex flex-col gap-5">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you going to do?" maxLength={100} />
        </div>

        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell viewers what to expect" maxLength={300} rows={2} />
        </div>

        {mode === "schedule" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.slug}
                onClick={() => setCategory(c.slug)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1",
                  category === c.slug ? "bg-white text-black border-white" : "border-border text-white"
                )}
              >
                <c.icon size={13} /> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white text-sm">Enable comments</span>
          <Switch checked={commentsOn} onChange={setCommentsOn} label="Enable comments" />
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-white text-sm">
            <Gift size={16} /> Enable gifts
          </span>
          <Switch checked={giftsEnabled} onChange={setGiftsEnabled} label="Enable gifts" />
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-white text-sm">
              <Users size={16} /> Allow guest requests
            </span>
            <Switch checked={guestsEnabled} onChange={setGuestsEnabled} label="Allow guest requests" />
          </div>
          {guestsEnabled && (
            <div className="flex items-center justify-between pl-6">
              <span className="text-muted-2 text-xs">Max guests</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMaxGuests((n) => Math.max(1, n - 1))}
                  className="w-7 h-7 rounded-full bg-surface-3 text-white flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-white text-sm w-4 text-center">{maxGuests}</span>
                <button
                  onClick={() => setMaxGuests((n) => Math.min(8, n + 1))}
                  className="w-7 h-7 rounded-full bg-surface-3 text-white flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        <Button size="lg" fullWidth onClick={handleStart} loading={loading} className="mt-2">
          {mode === "schedule" ? "Schedule Live" : "Start Live"}
        </Button>
      </div>
    </PageContainer>
  );
}

function ConnectionBadge({ quality }: { quality: "excellent" | "good" | "weak" | "offline" }) {
  const config = {
    excellent: { label: "Excellent connection", color: "text-success", Icon: CheckCircle2 },
    good: { label: "Good connection", color: "text-success", Icon: CheckCircle2 },
    weak: { label: "Weak connection", color: "text-warning", Icon: AlertTriangle },
    offline: { label: "No connection", color: "text-danger", Icon: AlertTriangle },
  }[quality];
  return (
    <span className={cn("flex items-center gap-1.5 bg-black/50 rounded-full px-2.5 py-1 text-[11px] font-medium", config.color)}>
      <config.Icon size={11} /> {config.label}
    </span>
  );
}

function RoundButton({ icon: Icon, onClick, label, active }: { icon: typeof Zap; onClick: () => void; label: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn("w-9 h-9 rounded-full flex items-center justify-center", active ? "bg-white text-black" : "bg-black/50 text-white")}
    >
      <Icon size={16} />
    </button>
  );
}
