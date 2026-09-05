"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  X,
  RotateCcw,
  Zap,
  ZapOff,
  Gauge,
  Sparkles,
  Wand2,
  Timer as TimerIcon,
  ZoomIn,
  Grid3x3,
  Upload as UploadIcon,
  Pause,
  Play,
  Check,
  Trash2,
  Music2,
} from "lucide-react";
import { useCameraRecorder } from "@/hooks/useCameraRecorder";
import { useCreateDraftStore, FILTER_PRESETS, buildFilterCss } from "@/store/create-draft";
import { AR_EFFECTS, drawArEffect } from "@/lib/ar-effects";
import { getFaceLandmarker } from "@/lib/face-tracking";
import { MAX_VIDEO_DURATIONS, RECORD_SPEEDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { toast } from "@/store/toast";
import { bakeVideo } from "@/lib/video-bake";
import { uploadVideoDraft } from "@/lib/save-draft";
import { useAuthStore } from "@/store/auth";
import { trackCreateEvent } from "@/lib/create-events";
import { DraftExitSheet } from "@/components/create/DraftExitSheet";

type Panel = "speed" | "filters" | "beauty" | "timer" | "effects" | null;

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreatePageInner />
    </Suspense>
  );
}

function CreatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cam = useCameraRecorder();
  const draft = useCreateDraftStore();
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const arCanvasRef = useRef<HTMLCanvasElement>(null);

  const [panel, setPanel] = useState<Panel>(null);
  const [timerSec, setTimerSec] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [grid, setGrid] = useState(false);
  const [exitTarget, setExitTarget] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHold = useRef(false);

  useEffect(() => {
    trackCreateEvent("CAMERA_OPENED");
    const soundId = searchParams.get("soundId");
    const soundLabel = searchParams.get("soundLabel");
    draft.reset();
    if (soundId) {
      useCreateDraftStore.getState().setSound(soundId, soundLabel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live AR effect preview: draws the mirrored camera feed onto a canvas and
  // overlays the selected effect anchored to real-time detected face
  // landmarks, purely for on-screen feedback while framing the shot. The
  // effect actually gets baked into the exported video by bakeVideo() (see
  // saveDraftAndExit / the editor's export step), which re-runs the same
  // face tracking against the recorded clip.
  useEffect(() => {
    if (draft.arEffectId === "none") return;
    let raf = 0;
    let cancelled = false;
    let landmarker: Awaited<ReturnType<typeof getFaceLandmarker>> = null;
    getFaceLandmarker().then((lm) => {
      if (!cancelled) landmarker = lm;
    });

    function render() {
      const video = cam.videoRef.current;
      const canvas = arCanvasRef.current;
      if (video && canvas && video.videoWidth) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        const mirrored = cam.facing === "user";
        if (ctx) {
          const cssFilter = FILTER_PRESETS.find((f) => f.id === draft.filterId)?.css ?? "";
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          if (mirrored) ctx.scale(-1, 1);
          ctx.scale(draft.zoom, draft.zoom);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
          ctx.filter = cssFilter || "none";
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();
          ctx.filter = "none";

          if (landmarker) {
            const landmarks = landmarker.detectForVideo(video, performance.now()).faceLandmarks?.[0] ?? null;
            drawArEffect(ctx, draft.arEffectId, landmarks, canvas.width, canvas.height, mirrored);
          }
        }
      }
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.arEffectId, draft.filterId, draft.zoom, cam.facing]);

  function requestExit(target: string) {
    if (draft.clips.length > 0) {
      setExitTarget(target);
    } else {
      router.push(target);
    }
  }

  async function saveDraftAndExit() {
    setSavingDraft(true);
    try {
      const result = await bakeVideo({
        clips: draft.clips.map((c) => ({ url: c.url })),
        speed: draft.speed,
        filterCss: buildFilterCss(draft.filterId),
        muteOriginal: false,
        transition: "cut",
        zoom: draft.zoom,
        arEffectId: draft.arEffectId,
        beauty: draft.beauty,
      });
      await uploadVideoDraft(result.blob, { duration: result.duration || totalClipSeconds, soundId: draft.soundId });
      trackCreateEvent("DRAFT_SAVED", { from: "camera" });
      toast("success", "Saved to your drafts");
      draft.reset();
      router.push(`/profile/${user?.username}`);
    } catch {
      toast("error", "Couldn't save that draft");
    } finally {
      setSavingDraft(false);
      setExitTarget(null);
    }
  }

  function discardAndExit() {
    trackCreateEvent("POST_CANCELLED", { from: "camera" });
    const target = exitTarget ?? "/home";
    draft.reset();
    setExitTarget(null);
    router.push(target);
  }

  const totalClipSeconds = draft.clips.reduce((s, c) => s + c.duration, 0);

  function tickElapsed() {
    elapsedTimer.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 0.1;
        if (totalClipSeconds + next >= draft.maxDuration) {
          stopAndSave();
        }
        return next;
      });
    }, 100);
  }

  function stopElapsedTimer() {
    if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    elapsedTimer.current = null;
  }

  async function beginRecording() {
    cam.startRecording();
    trackCreateEvent("RECORD_STARTED");
    setElapsed(0);
    tickElapsed();
  }

  async function handleRecordPress() {
    if (cam.recording) return;
    if (timerSec > 0) {
      setCountdown(timerSec);
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c === null) return null;
          if (c <= 1) {
            clearInterval(interval);
            beginRecording();
            return null;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      beginRecording();
    }
  }

  async function stopAndSave() {
    stopElapsedTimer();
    if (!cam.recording) return;
    const blob = await cam.stopRecording();
    if (blob && blob.size > 0) {
      const url = URL.createObjectURL(blob);
      draft.addClip({ id: nanoid(8), url, duration: elapsed });
      trackCreateEvent("RECORD_COMPLETED", { durationSec: Math.round(elapsed) });
    }
    setElapsed(0);
  }

  function handlePointerDown() {
    isHold.current = false;
    holdTimeout.current = setTimeout(() => {
      isHold.current = true;
      handleRecordPress();
    }, 280);
  }

  function handlePointerUp() {
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (isHold.current && cam.recording) {
      stopAndSave();
    }
  }

  function handleTap() {
    if (isHold.current) return;
    if (cam.recording) {
      stopAndSave();
    } else {
      handleRecordPress();
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast("error", "Please choose a video file");
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.src = url;
    probe.onloadedmetadata = () => {
      draft.setClips([{ id: nanoid(8), url, duration: probe.duration }]);
      trackCreateEvent("VIDEO_UPLOADED");
      router.push("/create/edit");
    };
  }

  function handleNext() {
    if (draft.clips.length === 0) return;
    router.push("/create/edit");
  }

  const filterCss = FILTER_PRESETS.find((f) => f.id === draft.filterId)?.css ?? "";
  const progressPct = Math.min(100, ((totalClipSeconds + elapsed) / draft.maxDuration) * 100);

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* preview */}
      <div className="relative flex-1 overflow-hidden">
        {cam.error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-white font-medium">{cam.error}</p>
            <button onClick={cam.retry} className="text-fliq-cyan text-sm underline">
              Try camera again
            </button>
          </div>
        ) : (
          <>
            <video
              ref={cam.videoRef}
              autoPlay
              muted
              playsInline
              className={cn("absolute inset-0 w-full h-full object-cover", draft.arEffectId !== "none" && "invisible")}
              style={{
                filter: filterCss || undefined,
                transform: `${cam.facing === "user" ? "scaleX(-1) " : ""}scale(${draft.zoom})`,
              }}
            />
            {draft.arEffectId !== "none" && <canvas ref={arCanvasRef} className="absolute inset-0 w-full h-full object-cover" />}
          </>
        )}

        {grid && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/25" />
            ))}
          </div>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white text-8xl font-extrabold animate-pop-in" key={countdown}>
              {countdown}
            </span>
          </div>
        )}

        {/* top bar */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)] z-10">
          <button onClick={() => requestExit("/home")} aria-label="Close" className="w-9 h-9 rounded-full bg-black/35 flex items-center justify-center text-white">
            <X size={20} />
          </button>
          <button
            onClick={() => toast("info", "Choose a sound from the library on the next screen")}
            className="flex items-center gap-1.5 bg-black/35 rounded-full px-3.5 py-1.5 text-white text-xs font-medium"
          >
            <Music2 size={13} /> {draft.soundLabel ?? "Add sound"}
          </button>
          <div className="w-9" />
        </div>

        {/* right tool rail */}
        <div className="absolute right-3 top-20 z-10 flex flex-col items-center gap-4">
          <ToolIcon icon={RotateCcw} label="Flip" onClick={cam.flip} />
          <ToolIcon
            icon={cam.torchOn ? Zap : ZapOff}
            label="Flash"
            active={cam.torchOn}
            disabled={!cam.torchSupported}
            onClick={cam.toggleTorch}
          />
          <ToolIcon icon={TimerIcon} label="Timer" active={timerSec > 0 || panel === "timer"} onClick={() => setPanel(panel === "timer" ? null : "timer")} />
          <ToolIcon icon={Gauge} label="Speed" active={draft.speed !== 1 || panel === "speed"} onClick={() => setPanel(panel === "speed" ? null : "speed")} />
          <ToolIcon icon={Wand2} label="Beauty" active={draft.beauty > 0 || panel === "beauty"} onClick={() => setPanel(panel === "beauty" ? null : "beauty")} />
          <ToolIcon icon={Sparkles} label="Filters" active={draft.filterId !== "none" || panel === "filters"} onClick={() => setPanel(panel === "filters" ? null : "filters")} />
          <ToolIcon icon={Grid3x3} label="Grid" active={grid} onClick={() => setGrid((g) => !g)} />
          <ToolIcon
            icon={ZoomIn}
            label={`${draft.zoom.toFixed(1)}x`}
            active={draft.zoom > 1}
            onClick={() => draft.setZoom(draft.zoom >= 3 ? 1 : draft.zoom + 1)}
          />
        </div>

        {/* recording progress ring context */}
        {(cam.recording || draft.clips.length > 0) && (
          <div className="absolute top-20 left-3 z-10 flex items-center gap-2 bg-black/35 rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-white text-xs font-medium tabular-nums">
              {(totalClipSeconds + elapsed).toFixed(1)}s / {draft.maxDuration}s
            </span>
          </div>
        )}

        {/* panels */}
        {panel === "speed" && (
          <PanelBar>
            {RECORD_SPEEDS.map((s) => (
              <PanelChip key={s} active={draft.speed === s} onClick={() => draft.setSpeed(s)}>
                {s}x
              </PanelChip>
            ))}
          </PanelBar>
        )}
        {panel === "timer" && (
          <PanelBar>
            {[0, 3, 10].map((s) => (
              <PanelChip key={s} active={timerSec === s} onClick={() => setTimerSec(s as 0 | 3 | 10)}>
                {s === 0 ? "Off" : `${s}s`}
              </PanelChip>
            ))}
          </PanelBar>
        )}
        {panel === "filters" && (
          <PanelBar wide>
            {FILTER_PRESETS.map((f) => (
              <PanelChip key={f.id} active={draft.filterId === f.id} onClick={() => draft.setFilterId(f.id)}>
                {f.label}
              </PanelChip>
            ))}
          </PanelBar>
        )}
        {panel === "effects" && (
          <PanelBar wide>
            {AR_EFFECTS.map((effect) => (
              <PanelChip key={effect.id} active={draft.arEffectId === effect.id} onClick={() => draft.setArEffectId(effect.id)}>
                {effect.emoji} {effect.label}
              </PanelChip>
            ))}
          </PanelBar>
        )}
        {panel === "beauty" && (
          <div className="absolute bottom-40 inset-x-6 z-10 glass rounded-xl px-4 py-3">
            <div className="flex items-center justify-between text-xs text-white mb-1.5">
              <span>Beauty</span>
              <span>{draft.beauty}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.beauty}
              onChange={(e) => draft.setBeauty(Number(e.target.value))}
              className="w-full accent-fliq-magenta"
              aria-label="Beauty intensity"
            />
          </div>
        )}

        {/* duration selector */}
        <div className="absolute bottom-28 inset-x-0 z-10 flex justify-center gap-2">
          {MAX_VIDEO_DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => draft.setMaxDuration(d)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border",
                draft.maxDuration === d ? "bg-white text-black border-white" : "border-white/30 text-white/80"
              )}
            >
              {d < 60 ? `${d}s` : `${d / 60} min`}
            </button>
          ))}
        </div>
      </div>

      {/* bottom controls */}
      <div className="relative z-10 bg-black pb-[max(env(safe-area-inset-bottom),18px)] pt-4">
        <div className="flex items-center justify-between px-8">
          <button
            onClick={() => setPanel(panel === "effects" ? null : "effects")}
            className="flex flex-col items-center gap-1.5 w-16 text-white"
          >
            <span className={cn("w-11 h-11 rounded-2xl flex items-center justify-center text-xl", draft.arEffectId !== "none" ? "bg-white" : "bg-surface-3")}>
              {draft.arEffectId !== "none" ? AR_EFFECTS.find((e) => e.id === draft.arEffectId)?.emoji : "😊"}
            </span>
            <span className="text-[11px]">Effects</span>
          </button>

          <div className="relative flex flex-col items-center gap-2">
            <button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onClick={handleTap}
              aria-label={cam.recording ? "Stop recording" : "Record"}
              className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center"
            >
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="32" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
                <circle
                  cx="36"
                  cy="36"
                  r="32"
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={2 * Math.PI * 32 * (1 - progressPct / 100)}
                  strokeLinecap="round"
                  className="transition-[stroke-dashoffset] duration-100"
                />
              </svg>
              <span className={cn("flex items-center justify-center rounded-full bg-danger transition-all", cam.recording ? "w-7 h-7 rounded-md" : "w-14 h-14")} />
            </button>
            {cam.recording && (
              <button onClick={cam.paused ? cam.resumeRecording : cam.pauseRecording} className="text-white/80 text-xs flex items-center gap-1">
                {cam.paused ? <Play size={12} /> : <Pause size={12} />} {cam.paused ? "Resume" : "Pause"}
              </button>
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 w-16 text-white"
            aria-label="Upload video"
          >
            <span className="w-11 h-11 rounded-2xl bg-surface-3 flex items-center justify-center">
              <UploadIcon size={20} />
            </span>
            <span className="text-[11px]">Upload</span>
          </button>
        </div>

        {draft.clips.length > 0 && (
          <div className="flex items-center justify-between px-8 mt-4">
            <button onClick={() => draft.removeLastClip()} className="flex items-center gap-1.5 text-white/80 text-xs">
              <Trash2 size={14} /> Undo clip
            </button>
            <button onClick={handleNext} className="flex items-center gap-1.5 bg-gradient-brand-horizontal text-white text-sm font-semibold px-5 py-2 rounded-full">
              Next <Check size={15} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-8 mt-4 text-sm">
          <span className="font-semibold text-white">Camera</span>
          <button onClick={() => requestExit("/create/photos")} className="font-semibold text-white/40 hover:text-white/70">
            Photos
          </button>
          <button onClick={() => requestExit("/live/start")} className="font-semibold text-white/40 hover:text-white/70">
            Live
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />

      <DraftExitSheet
        open={exitTarget !== null}
        onClose={() => setExitTarget(null)}
        onSave={saveDraftAndExit}
        onDiscard={discardAndExit}
        saving={savingDraft}
        kind="video"
      />
    </div>
  );
}

function ToolIcon({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: typeof Zap;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} className="flex flex-col items-center gap-1 disabled:opacity-30">
      <span className={cn("w-9 h-9 rounded-full flex items-center justify-center", active ? "bg-white text-black" : "bg-black/35 text-white")}>
        <Icon size={16} />
      </span>
      <span className="text-[10px] text-white drop-shadow">{label}</span>
    </button>
  );
}

function PanelBar({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("absolute bottom-40 inset-x-0 z-10 flex justify-center gap-2 px-4", wide && "overflow-x-auto no-scrollbar justify-start")}>
      {children}
    </div>
  );
}

function PanelChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-xs font-semibold border shrink-0",
        active ? "bg-white text-black border-white" : "bg-black/35 text-white border-white/25"
      )}
    >
      {children}
    </button>
  );
}
