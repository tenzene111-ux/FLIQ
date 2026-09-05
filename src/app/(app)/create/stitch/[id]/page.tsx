"use client";

import { useEffect, useRef, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Circle, Square, ChevronRight } from "lucide-react";
import { useCreateDraftStore } from "@/store/create-draft";
import { toast } from "@/store/toast";
import { ErrorState } from "@/components/ui/ErrorState";
import { bakeVideo } from "@/lib/video-bake";
import { formatDuration } from "@/lib/utils";
import type { VideoDTO } from "@/types/models";

// Real TikTok caps a Stitch snippet at 5 seconds of the original clip.
const STITCH_WINDOW_SECONDS = 5;

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "video/webm";
}

type Phase = "trim" | "record" | "processing";

export default function StitchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const draft = useCreateDraftStore();

  const [original, setOriginal] = useState<VideoDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("trim");
  const [trimStart, setTrimStart] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);

  const trimPreviewRef = useRef<HTMLVideoElement>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const recordedUrlRef = useRef<string | null>(null);

  const windowLength = original ? Math.min(STITCH_WINDOW_SECONDS, original.duration) : STITCH_WINDOW_SECONDS;
  const maxTrimStart = original ? Math.max(0, original.duration - windowLength) : 0;

  useEffect(() => {
    if (typeof MediaRecorder === "undefined") {
      setLoadError("Stitch isn't supported in this browser.");
      return;
    }
    fetch(`/api/videos/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.video || !d.video.allowStitch || d.video.postType === "photo") throw new Error();
        setOriginal(d.video);
      })
      .catch(() => setLoadError("This video isn't available for Stitch."));
  }, [id]);

  // Loop-preview the currently selected 5s window while trimming.
  useEffect(() => {
    const v = trimPreviewRef.current;
    if (!v || phase !== "trim" || !original) return;
    v.currentTime = trimStart;
    v.play().catch(() => {});
    function onTimeUpdate() {
      if (v!.currentTime >= trimStart + windowLength) {
        v!.currentTime = trimStart;
        v!.play().catch(() => {});
      }
    }
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [phase, trimStart, windowLength, original]);

  useEffect(() => {
    if (phase !== "record") return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } }, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        camStreamRef.current = stream;
        if (camVideoRef.current) {
          camVideoRef.current.srcObject = stream;
          camVideoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setCamError("Camera access isn't available for Stitch."));
    return () => {
      cancelled = true;
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [phase]);

  function startRecording() {
    const stream = camStreamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = onOwnClipRecorded;
    recorder.start(200);
    recorderRef.current = recorder;

    setRecording(true);
    setElapsed(0);
    elapsedRef.current = 0;
    elapsedTimerRef.current = setInterval(() => {
      elapsedRef.current += 0.1;
      setElapsed(elapsedRef.current);
    }, 100);
  }

  function stopRecording() {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    recorderRef.current?.stop();
  }

  async function onOwnClipRecorded() {
    setRecording(false);
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    if (blob.size === 0) {
      toast("error", "Recording came out empty. Try again.");
      return;
    }
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordedUrlRef.current = URL.createObjectURL(blob);
    await composeStitch();
  }

  async function composeStitch() {
    if (!original || !original.videoUrl || !recordedUrlRef.current) return;
    setPhase("processing");
    setProgress(0);
    try {
      const result = await bakeVideo({
        clips: [
          { url: original.videoUrl, trimStart, trimEnd: trimStart + windowLength },
          { url: recordedUrlRef.current },
        ],
        speed: 1,
        filterCss: "",
        muteOriginal: false,
        transition: "cut",
        onProgress: setProgress,
      });
      draft.reset();
      draft.setStitchOf(original.id, original.user.username);
      draft.setFinal(URL.createObjectURL(result.blob), result.duration);
      router.push("/create/post");
    } catch {
      toast("error", "Couldn't put your Stitch together. Try again.");
      setPhase("record");
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-3">
          <button onClick={() => router.back()} className="text-white" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <ErrorState title={loadError} onRetry={() => router.back()} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-3 z-10">
        <button
          onClick={() => router.back()}
          className="text-white"
          aria-label="Back"
          disabled={recording || phase === "processing"}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-semibold text-base">
          {original ? `Stitch with @${original.user.username}` : "Stitch"}
        </h1>
      </div>

      {phase === "trim" && (
        <>
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="relative w-full max-w-xs aspect-[9/16] rounded-xl overflow-hidden bg-surface-2">
              {original?.videoUrl && (
                <video ref={trimPreviewRef} src={original.videoUrl} muted playsInline className="w-full h-full object-cover" />
              )}
            </div>
          </div>
          <div className="px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-4">
            <p className="text-white/70 text-xs text-center mb-2">
              Choose {windowLength}s of the original to Stitch — {formatDuration(trimStart)} – {formatDuration(trimStart + windowLength)}
            </p>
            <input
              type="range"
              min={0}
              max={maxTrimStart}
              step={0.1}
              value={trimStart}
              onChange={(e) => setTrimStart(Number(e.target.value))}
              disabled={maxTrimStart === 0}
              className="w-full accent-fliq-magenta"
              aria-label="Select part of the original video to Stitch"
            />
            <button
              onClick={() => setPhase("record")}
              disabled={!original}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-3 rounded-full bg-white text-black font-semibold text-sm disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {phase === "record" && (
        <>
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="relative w-full max-w-xs aspect-[9/16] rounded-xl overflow-hidden bg-surface-2">
              <video ref={camVideoRef} muted playsInline className="w-full h-full object-cover -scale-x-100" />
              {recording && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-danger/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  {elapsed.toFixed(1)}s
                </div>
              )}
              {camError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-sm text-white">{camError}</div>
              )}
            </div>
          </div>
          <p className="text-white/70 text-xs text-center px-6">Record your part — it&apos;ll play right after the original clip.</p>
          <div className="px-4 pb-[max(env(safe-area-inset-bottom),24px)] pt-4 flex items-center justify-center">
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={!!camError}
              aria-label={recording ? "Stop recording" : "Start recording"}
              className="w-[72px] h-[72px] rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40"
            >
              {recording ? (
                <Square size={28} className="text-danger" fill="currentColor" />
              ) : (
                <Circle size={54} className="text-danger" fill="currentColor" />
              )}
            </button>
          </div>
        </>
      )}

      {phase === "processing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <p className="text-white font-medium">Putting your Stitch together...</p>
          <div className="w-full max-w-xs h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-fliq-magenta transition-[width] duration-150" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
