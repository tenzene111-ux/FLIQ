"use client";

import { useEffect, useRef, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Circle, Square } from "lucide-react";
import { useCreateDraftStore } from "@/store/create-draft";
import { toast } from "@/store/toast";
import { ErrorState } from "@/components/ui/ErrorState";
import type { VideoDTO } from "@/types/models";

const WIDTH = 720;
const HEIGHT = 1280;

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "video/webm";
}

// Draws `media` into the destination rect with object-fit: cover semantics.
function drawCover(ctx: CanvasRenderingContext2D, media: HTMLVideoElement, dx: number, dy: number, dw: number, dh: number) {
  const vw = media.videoWidth;
  const vh = media.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(dw / vw, dh / vh);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.drawImage(media, sx, sy, sw, sh, dx, dy, dw, dh);
}

export default function DuetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const draft = useCreateDraftStore();

  const [original, setOriginal] = useState<VideoDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [processing, setProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const origVideoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (typeof MediaRecorder === "undefined") {
      setLoadError("Duet isn't supported in this browser.");
      return;
    }
    fetch(`/api/videos/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.video || !d.video.allowDuet) throw new Error();
        setOriginal(d.video);
      })
      .catch(() => setLoadError("This video isn't available for Duet."));
  }, [id]);

  useEffect(() => {
    if (!original) return;
    const v = document.createElement("video");
    v.src = original.videoUrl;
    v.crossOrigin = "anonymous";
    v.muted = false;
    v.playsInline = true;
    origVideoRef.current = v;
    return () => {
      v.pause();
      origVideoRef.current = null;
    };
  }, [original]);

  useEffect(() => {
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
      .catch(() => setCamError("Camera access isn't available for Duet."));
    return () => {
      cancelled = true;
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const orig = origVideoRef.current;
      const cam = camVideoRef.current;
      if (canvas && ctx) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        if (orig && orig.readyState >= 2) drawCover(ctx, orig, 0, 0, WIDTH / 2, HEIGHT);
        if (cam && cam.readyState >= 2) drawCover(ctx, cam, WIDTH / 2, 0, WIDTH / 2, HEIGHT);
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(WIDTH / 2, 0);
        ctx.lineTo(WIDTH / 2, HEIGHT);
        ctx.stroke();
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  async function startRecording() {
    const canvas = canvasRef.current;
    const orig = origVideoRef.current;
    const camStream = camStreamRef.current;
    if (!canvas || !orig || !camStream) return;

    try {
      orig.currentTime = 0;
      await new Promise<void>((res) => {
        orig.onseeked = () => res();
      });
      await orig.play().catch(() => {});

      const audioCtx = new AudioContext();
      const destination = audioCtx.createMediaStreamDestination();
      try {
        const origStream = (orig as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
        const origAudioTrack = origStream?.getAudioTracks()[0];
        if (origAudioTrack) audioCtx.createMediaStreamSource(new MediaStream([origAudioTrack])).connect(destination);
      } catch {
        // original clip audio couldn't be captured — recording continues with mic only
      }
      const micTrack = camStream.getAudioTracks()[0];
      if (micTrack) audioCtx.createMediaStreamSource(new MediaStream([micTrack])).connect(destination);

      const canvasStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(30);
      const combined = new MediaStream([...canvasStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);

      chunksRef.current = [];
      const recorder = new MediaRecorder(combined, { mimeType: pickMimeType() });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = finishRecording;
      recorder.start(200);
      recorderRef.current = recorder;

      setRecording(true);
      setElapsed(0);
      elapsedRef.current = 0;
      elapsedTimerRef.current = setInterval(() => {
        elapsedRef.current += 0.1;
        setElapsed(elapsedRef.current);
      }, 100);
      orig.onended = () => stopRecording();
    } catch {
      toast("error", "Couldn't start recording. Try again.");
    }
  }

  function stopRecording() {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    origVideoRef.current?.pause();
    recorderRef.current?.stop();
  }

  function finishRecording() {
    setProcessing(true);
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    if (blob.size === 0) {
      toast("error", "Recording came out empty. Try again.");
      setProcessing(false);
      setRecording(false);
      return;
    }
    const url = URL.createObjectURL(blob);
    draft.reset();
    draft.setDuetOf(original!.id, original!.user.username);
    draft.setFinal(url, elapsedRef.current);
    router.push("/create/post");
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
        <button onClick={() => router.back()} className="text-white" aria-label="Back" disabled={recording || processing}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-semibold text-base">{original ? `Duet with @${original.user.username}` : "Duet"}</h1>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="relative w-full max-w-xs aspect-[9/16] rounded-xl overflow-hidden bg-surface-2">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="w-full h-full object-cover" />
          <video ref={camVideoRef} muted playsInline className="hidden" />
          {recording && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-danger/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {elapsed.toFixed(1)}s / {original?.duration ?? 0}s
            </div>
          )}
          {camError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-sm text-white">{camError}</div>
          )}
        </div>
      </div>

      <div className="px-4 pb-[max(env(safe-area-inset-bottom),24px)] pt-4 flex items-center justify-center">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={!original || !!camError || processing}
          aria-label={recording ? "Stop recording" : "Start recording"}
          className="w-[72px] h-[72px] rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40"
        >
          {recording ? <Square size={28} className="text-danger" fill="currentColor" /> : <Circle size={54} className="text-danger" fill="currentColor" />}
        </button>
      </div>
    </div>
  );
}
