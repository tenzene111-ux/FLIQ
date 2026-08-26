"use client";

// Client-side video "baking" pipeline: renders one or more recorded/uploaded
// clips onto a canvas (applying filter, speed, trim, text/sticker overlays,
// and cross-clip transitions) and re-encodes the result in real time via
// MediaRecorder + Web Audio API mixing. This lets Fliq's editor apply real
// edits entirely in the browser with no server-side transcoding pipeline.

export interface BakeClip {
  url: string;
  trimStart?: number;
  trimEnd?: number;
}

export interface BakeTextLayer {
  text: string;
  x: number; // 0-100
  y: number; // 0-100
  color: string;
}

export interface BakeStickerLayer {
  emoji: string;
  x: number;
  y: number;
}

export interface BakeOptions {
  clips: BakeClip[];
  speed: number;
  filterCss: string;
  muteOriginal: boolean;
  transition: "cut" | "fade";
  voiceoverBlob?: Blob | null;
  textLayers?: BakeTextLayer[];
  stickerLayers?: BakeStickerLayer[];
  zoom?: number;
  width?: number;
  height?: number;
  fps?: number;
  onProgress?: (pct: number) => void;
}

export interface BakeResult {
  blob: Blob;
  duration: number;
}

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "video/webm";
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("video");
    el.src = url;
    el.muted = false;
    el.volume = 0; // silence output while still producing an audio track for captureStream
    el.playsInline = true;
    el.crossOrigin = "anonymous";
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration)) {
        resolve(el);
        return;
      }
      // Chromium reports duration as Infinity for a freshly-recorded
      // MediaRecorder blob until you seek — seeking past the end forces it
      // to resolve the real duration via a timeupdate event.
      el.currentTime = 1e10;
      el.ontimeupdate = () => {
        el.ontimeupdate = null;
        el.currentTime = 0;
        resolve(el);
      };
    };
    el.onerror = () => reject(new Error("Couldn't load clip"));
  });
}

export async function bakeVideo(opts: BakeOptions): Promise<BakeResult> {
  if (typeof window === "undefined" || !("MediaRecorder" in window)) {
    throw new Error("Video editing isn't supported in this browser");
  }
  const width = opts.width ?? 480;
  const height = opts.height ?? 854;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) throw new Error("Canvas not supported");
  const ctx: CanvasRenderingContext2D = ctx2d;

  const videos = await Promise.all(opts.clips.map((c) => loadVideo(c.url)));

  const audioCtx = new AudioContext();
  const destination = audioCtx.createMediaStreamDestination();
  let hasAudio = false;

  if (!opts.muteOriginal) {
    for (const v of videos) {
      try {
        const stream = (v as unknown as { captureStream?: () => MediaStream }).captureStream?.();
        const track = stream?.getAudioTracks()[0];
        if (track && stream) {
          const src = audioCtx.createMediaStreamSource(new MediaStream([track]));
          src.connect(destination);
          hasAudio = true;
        }
      } catch {
        // some browsers can't captureStream a not-yet-playing element — skip audio for this clip
      }
    }
  }

  let voiceoverEl: HTMLAudioElement | null = null;
  if (opts.voiceoverBlob) {
    voiceoverEl = new Audio(URL.createObjectURL(opts.voiceoverBlob));
    voiceoverEl.volume = 0;
    await new Promise<void>((res) => {
      voiceoverEl!.onloadedmetadata = () => res();
    });
    try {
      const stream = (voiceoverEl as unknown as { captureStream?: () => MediaStream }).captureStream?.();
      const track = stream?.getAudioTracks()[0];
      if (track) {
        audioCtx.createMediaStreamSource(new MediaStream([track])).connect(destination);
        hasAudio = true;
      }
    } catch {
      // ignore — voiceover mixing is best-effort
    }
  }

  const canvasStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(opts.fps ?? 30);
  const combined = new MediaStream([...canvasStream.getVideoTracks(), ...(hasAudio ? destination.stream.getAudioTracks() : [])]);

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(combined, { mimeType: pickMimeType(), videoBitsPerSecond: 4_000_000 });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const totalDuration = opts.clips.reduce((sum, c, i) => {
    const v = videos[i];
    const start = c.trimStart ?? 0;
    const end = c.trimEnd ?? v.duration;
    return sum + Math.max(0, end - start) / opts.speed;
  }, 0);

  const startedAt = performance.now();
  const finished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });

  recorder.start(250);
  if (voiceoverEl) voiceoverEl.play().catch(() => {});

  const TRANSITION_MS = 280;

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const clipMeta = opts.clips[i];
    const start = clipMeta.trimStart ?? 0;
    const end = clipMeta.trimEnd ?? v.duration;
    v.playbackRate = opts.speed;
    v.currentTime = start;
    await new Promise<void>((res) => {
      const onSeeked = () => {
        v.removeEventListener("seeked", onSeeked);
        res();
      };
      v.addEventListener("seeked", onSeeked);
    });
    await v.play().catch(() => {});

    const next = videos[i + 1];
    let nextStarted = false;

    await new Promise<void>((resolveClip) => {
      function draw() {
        const remainingMs = ((end - v.currentTime) / opts.speed) * 1000;
        const inTransition = opts.transition === "fade" && next && remainingMs <= TRANSITION_MS && remainingMs >= 0;

        drawFrame(ctx, v, width, height, opts.filterCss, opts.zoom ?? 1);

        if (inTransition) {
          if (!nextStarted) {
            nextStarted = true;
            next.currentTime = opts.clips[i + 1]?.trimStart ?? 0;
            next.playbackRate = opts.speed;
            next.play().catch(() => {});
          }
          const alpha = 1 - Math.max(0, remainingMs) / TRANSITION_MS;
          ctx.save();
          ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
          drawFrame(ctx, next, width, height, opts.filterCss, opts.zoom ?? 1);
          ctx.restore();
        }

        drawOverlays(ctx, width, height, opts.textLayers, opts.stickerLayers);

        opts.onProgress?.(Math.min(99, ((performance.now() - startedAt) / (totalDuration * 1000)) * 100));

        if (v.currentTime >= end - 0.02 || v.ended) {
          v.pause();
          resolveClip();
          return;
        }
        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    });
  }

  await new Promise((r) => setTimeout(r, 150));
  recorder.stop();
  voiceoverEl?.pause();
  const blob = await finished;
  audioCtx.close().catch(() => {});
  opts.onProgress?.(100);

  return { blob, duration: totalDuration };
}

function drawFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number, filterCss: string, zoom = 1) {
  ctx.filter = filterCss || "none";
  const vw = video.videoWidth || width;
  const vh = video.videoHeight || height;
  const canvasRatio = width / height;
  const videoRatio = vw / vh;
  let sw = vw,
    sh = vh;
  if (videoRatio > canvasRatio) {
    sw = vh * canvasRatio;
  } else {
    sh = vw / canvasRatio;
  }
  // Apply zoom by shrinking the source sample window (crops in around center).
  sw = sw / Math.max(1, zoom);
  sh = sh / Math.max(1, zoom);
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
  ctx.filter = "none";
}

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  textLayers?: BakeTextLayer[],
  stickerLayers?: BakeStickerLayer[]
) {
  textLayers?.forEach((t) => {
    const px = (t.x / 100) * width;
    const py = (t.y / 100) * height;
    ctx.font = `700 ${Math.round(width * 0.06)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.fillStyle = t.color;
    ctx.strokeText(t.text, px, py);
    ctx.fillText(t.text, px, py);
  });
  stickerLayers?.forEach((s) => {
    const px = (s.x / 100) * width;
    const py = (s.y / 100) * height;
    ctx.font = `${Math.round(width * 0.12)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(s.emoji, px, py);
  });
}
