"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Type,
  Smile,
  Music2,
  Gauge,
  Sparkles,
  Wand2,
  Mic,
  Scissors,
  Volume2,
  VolumeX,
  Undo2,
  Redo2,
  Trash2,
  X,
  Captions,
  Settings2,
} from "lucide-react";
import { useCreateDraftStore, FILTER_PRESETS, buildFilterCss, type TextLayer, type StickerLayer } from "@/store/create-draft";
import { bakeVideo } from "@/lib/video-bake";
import { RECORD_SPEEDS } from "@/lib/constants";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/toast";
import { cn, formatDuration } from "@/lib/utils";
import { nanoid } from "nanoid";

const STICKER_EMOJIS = ["🔥", "✨", "💯", "😂", "❤️", "👀", "🎉", "😎", "🙌", "💃", "🎶", "⚡", "🌟", "😭", "🥳", "👍"];
const EXPORT_RES = [
  { id: "720p", w: 480, h: 854, label: "720p" },
  { id: "1080p", w: 720, h: 1280, label: "1080p" },
  { id: "4k", w: 1080, h: 1920, label: "4K" },
] as const;
const FPS_OPTIONS = [24, 30, 60] as const;

interface Snapshot {
  textLayers: TextLayer[];
  stickerLayers: StickerLayer[];
}

export default function EditorPage() {
  const router = useRouter();
  const draft = useCreateDraftStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [clipIndex, setClipIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [sheet, setSheet] = useState<"text" | "stickers" | "sound" | "speed" | "filters" | "beauty" | "export" | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [duration, setDuration] = useState(0);
  const [baking, setBaking] = useState(false);
  const [bakeProgress, setBakeProgress] = useState(0);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [recordingVoiceover, setRecordingVoiceover] = useState(false);
  const [voiceoverBlob, setVoiceoverBlob] = useState<Blob | null>(null);
  const [exportRes, setExportRes] = useState<(typeof EXPORT_RES)[number]>(EXPORT_RES[1]);
  const [fps, setFps] = useState<number>(30);
  const [sounds, setSounds] = useState<{ id: string; title: string; artist: string; coverUrl: string }[] | null>(null);
  const [draggingLayer, setDraggingLayer] = useState<{ type: "text" | "sticker"; id: string } | null>(null);
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [historyLens, setHistoryLens] = useState({ past: 0, future: 0 });
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (draft.clips.length === 0) {
      router.replace("/create");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clip = draft.clips[clipIndex];
  const isSingleClip = draft.clips.length === 1;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !clip) return;
    setDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
  }, [clip]);

  function handleLoadedMetadata() {
    const el = videoRef.current;
    if (!el) return;
    setDuration(el.duration);
    setTrimEnd(el.duration);
    el.playbackRate = draft.speed;
  }

  function handleTimeUpdate() {
    const el = videoRef.current;
    if (!el) return;
    if (isSingleClip && el.currentTime >= trimEnd) {
      el.currentTime = trimStart;
    }
  }

  function handleEnded() {
    if (clipIndex < draft.clips.length - 1) {
      setClipIndex((i) => i + 1);
    } else {
      setClipIndex(0);
      if (videoRef.current) videoRef.current.currentTime = isSingleClip ? trimStart : 0;
      videoRef.current?.play().catch(() => {});
    }
  }

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function snapshot() {
    past.current.push({ textLayers: draft.textLayers, stickerLayers: draft.stickerLayers });
    future.current = [];
    setHistoryLens({ past: past.current.length, future: future.current.length });
  }

  function undo() {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ textLayers: draft.textLayers, stickerLayers: draft.stickerLayers });
    useCreateDraftStore.setState({ textLayers: prev.textLayers, stickerLayers: prev.stickerLayers });
    setHistoryLens({ past: past.current.length, future: future.current.length });
  }

  function redo() {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ textLayers: draft.textLayers, stickerLayers: draft.stickerLayers });
    useCreateDraftStore.setState({ textLayers: next.textLayers, stickerLayers: next.stickerLayers });
    setHistoryLens({ past: past.current.length, future: future.current.length });
  }

  function addText(text: string) {
    if (!text.trim()) return;
    snapshot();
    draft.addTextLayer({ id: nanoid(6), text: text.trim(), x: 50, y: 50, color: "#ffffff" });
    setSheet(null);
  }

  function addSticker(emoji: string) {
    snapshot();
    draft.addStickerLayer({ id: nanoid(6), emoji, x: 50, y: 40 });
    setSheet(null);
  }

  function handleLayerDrag(e: React.PointerEvent, type: "text" | "sticker", id: string) {
    const container = previewRef.current;
    if (!container) return;
    setDraggingLayer({ type, id });
    const rect = container.getBoundingClientRect();
    function move(ev: PointerEvent) {
      const x = Math.min(96, Math.max(4, ((ev.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(96, Math.max(4, ((ev.clientY - rect.top) / rect.height) * 100));
      if (type === "text") draft.updateTextLayer(id, { x, y });
      else draft.updateStickerLayer(id, { x, y });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDraggingLayer(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  async function toggleVoiceover() {
    if (recordingVoiceover) {
      voiceRecorderRef.current?.stop();
      setRecordingVoiceover(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data.size && voiceChunksRef.current.push(e.data);
      recorder.onstop = () => {
        setVoiceoverBlob(new Blob(voiceChunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
        toast("success", "Voiceover recorded");
      };
      recorder.start();
      voiceRecorderRef.current = recorder;
      setRecordingVoiceover(true);
    } catch {
      toast("error", "Microphone access is required to record a voiceover");
    }
  }

  function openSoundSheet() {
    setSheet("sound");
    if (!sounds) {
      fetch("/api/sounds")
        .then((r) => r.json())
        .then((d) => setSounds(d.sounds))
        .catch(() => setSounds([]));
    }
  }

  async function handleDone() {
    setBaking(true);
    setBakeProgress(0);
    try {
      const filterCss = buildFilterCss(draft.filterId, draft.beauty);
      const clipsForBake = draft.clips.map((c, i) => ({
        url: c.url,
        trimStart: isSingleClip && i === 0 ? trimStart : undefined,
        trimEnd: isSingleClip && i === 0 ? trimEnd : undefined,
      }));
      const result = await bakeVideo({
        clips: clipsForBake,
        speed: draft.speed,
        filterCss,
        muteOriginal: draft.muteOriginal,
        transition: draft.transition,
        voiceoverBlob,
        textLayers: draft.textLayers,
        stickerLayers: draft.stickerLayers,
        zoom: draft.zoom,
        width: exportRes.w,
        height: exportRes.h,
        fps,
        onProgress: setBakeProgress,
      });
      const url = URL.createObjectURL(result.blob);
      draft.setFinal(url, result.duration || draft.clips.reduce((s, c) => s + c.duration, 0));
      await generateCover(url);
      router.push("/create/post");
    } catch (err) {
      console.error(err);
      toast("info", "Advanced edits couldn't be applied — using your original clip instead.");
      try {
        const res = await fetch(draft.clips[0].url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        draft.setFinal(url, draft.clips.reduce((s, c) => s + c.duration, 0));
        await generateCover(url);
        router.push("/create/post");
      } catch {
        toast("error", "Couldn't process your video. Please try again.");
      }
    } finally {
      setBaking(false);
    }
  }

  async function generateCover(url: string): Promise<void> {
    return new Promise((resolve) => {
      const v = document.createElement("video");
      v.src = url;
      v.muted = true;
      v.onloadeddata = () => {
        v.currentTime = Math.min(0.5, v.duration / 2);
      };
      v.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 405;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          draft.setCover(canvas.toDataURL("image/jpeg", 0.85));
        }
        resolve();
      };
      v.onerror = () => resolve();
    });
  }

  if (!clip) return null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)] pb-2 shrink-0">
        <button onClick={() => router.back()} className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-3">
          <button onClick={undo} disabled={historyLens.past === 0} className="text-white disabled:opacity-30" aria-label="Undo">
            <Undo2 size={19} />
          </button>
          <button onClick={redo} disabled={historyLens.future === 0} className="text-white disabled:opacity-30" aria-label="Redo">
            <Redo2 size={19} />
          </button>
          <button onClick={() => setSheet("export")} className="text-white" aria-label="Export settings">
            <Settings2 size={19} />
          </button>
        </div>
        <Button size="sm" onClick={handleDone} loading={baking}>
          {baking ? `${Math.round(bakeProgress)}%` : "Next"}
        </Button>
      </div>

      <div ref={previewRef} className="relative flex-1 overflow-hidden mx-auto w-full max-w-[480px] bg-surface">
        <video
          ref={videoRef}
          src={clip.url}
          autoPlay
          playsInline
          muted={draft.muteOriginal}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: buildFilterCss(draft.filterId, draft.beauty) || undefined, transform: `scale(${draft.zoom})` }}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onClick={togglePlay}
        />
        {!playing && <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20" />}

        {draft.textLayers.map((t) => (
          <div
            key={t.id}
            onPointerDown={(e) => handleLayerDrag(e, "text", t.id)}
            className={cn("absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none font-bold text-lg px-1 touch-none", draggingLayer?.id === t.id && "ring-2 ring-fliq-cyan rounded")}
            style={{ left: `${t.x}%`, top: `${t.y}%`, color: t.color, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
          >
            {t.text}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => draft.removeTextLayer(t.id)}
              className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center"
              aria-label="Remove text"
            >
              <X size={9} />
            </button>
          </div>
        ))}
        {draft.stickerLayers.map((s) => (
          <div
            key={s.id}
            onPointerDown={(e) => handleLayerDrag(e, "sticker", s.id)}
            className={cn("absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none text-4xl touch-none", draggingLayer?.id === s.id && "ring-2 ring-fliq-cyan rounded")}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          >
            {s.emoji}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => draft.removeStickerLayer(s.id)}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center"
              aria-label="Remove sticker"
            >
              <X size={9} />
            </button>
          </div>
        ))}

        {captionsOn && (
          <div className="absolute bottom-16 inset-x-6 text-center">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">Captions will generate after upload</span>
          </div>
        )}

        {draft.clips.length > 1 && (
          <div className="absolute top-3 left-3 bg-black/45 text-white text-xs font-medium px-2 py-1 rounded-full">
            Clip {clipIndex + 1}/{draft.clips.length}
          </div>
        )}
      </div>

      {isSingleClip && duration > 0 && (
        <div className="px-4 py-3 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-muted mb-1">
            <span className="flex items-center gap-1">
              <Scissors size={11} /> Trim
            </span>
            <span>
              {formatDuration(trimEnd - trimStart)} / {formatDuration(duration)}
            </span>
          </div>
          <div className="relative h-8 bg-surface-2 rounded-lg overflow-hidden">
            <div
              className="absolute inset-y-0 bg-gradient-brand-soft border-x-2 border-fliq-magenta"
              style={{ left: `${(trimStart / duration) * 100}%`, right: `${100 - (trimEnd / duration) * 100}%` }}
            />
          </div>
          <div className="flex gap-3 mt-2">
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={trimStart}
              onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.5))}
              className="flex-1 accent-fliq-magenta"
              aria-label="Trim start"
            />
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={trimEnd}
              onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.5))}
              className="flex-1 accent-fliq-cyan"
              aria-label="Trim end"
            />
          </div>
        </div>
      )}

      <div className="shrink-0 pb-[max(env(safe-area-inset-bottom),14px)] pt-1 border-t border-border">
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar px-4 py-3">
          <EditorTool icon={Type} label="Text" onClick={() => setSheet("text")} />
          <EditorTool icon={Smile} label="Stickers" onClick={() => setSheet("stickers")} />
          <EditorTool icon={Music2} label="Music" onClick={openSoundSheet} active={!!draft.soundId} />
          <EditorTool icon={Gauge} label="Speed" onClick={() => setSheet("speed")} active={draft.speed !== 1} />
          <EditorTool icon={Sparkles} label="Filters" onClick={() => setSheet("filters")} active={draft.filterId !== "none"} />
          <EditorTool icon={Wand2} label="Beauty" onClick={() => setSheet("beauty")} active={draft.beauty > 0} />
          <EditorTool
            icon={Mic}
            label={recordingVoiceover ? "Stop" : "Voiceover"}
            onClick={toggleVoiceover}
            active={recordingVoiceover || !!voiceoverBlob}
            danger={recordingVoiceover}
          />
          <EditorTool
            icon={draft.muteOriginal ? VolumeX : Volume2}
            label="Original audio"
            onClick={() => draft.setMuteOriginal(!draft.muteOriginal)}
            active={!draft.muteOriginal}
          />
          <EditorTool icon={Captions} label="Captions" onClick={() => setCaptionsOn((v) => !v)} active={captionsOn} />
          {voiceoverBlob && <EditorTool icon={Trash2} label="Remove VO" onClick={() => setVoiceoverBlob(null)} />}
        </div>
      </div>

      <Sheet open={sheet === "text"} onClose={() => setSheet(null)} title="Add text">
        <TextComposer onSubmit={addText} />
      </Sheet>

      <Sheet open={sheet === "stickers"} onClose={() => setSheet(null)} title="Add sticker">
        <div className="grid grid-cols-6 gap-3 px-4 pb-4">
          {STICKER_EMOJIS.map((e) => (
            <button key={e} onClick={() => addSticker(e)} className="text-3xl hover:scale-110 transition-transform">
              {e}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "sound"} onClose={() => setSheet(null)} title="Add music">
        <div className="pb-4">
          {sounds === null && <p className="text-center text-muted text-sm py-6">Loading sounds...</p>}
          {sounds?.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                draft.setSound(s.id, `${s.title} · ${s.artist}`);
                setSheet(null);
              }}
              className={cn("w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5", draft.soundId === s.id && "bg-white/5")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <div className="text-left min-w-0">
                <p className="text-white text-sm font-medium truncate">{s.title}</p>
                <p className="text-muted-2 text-xs truncate">{s.artist}</p>
              </div>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "speed"} onClose={() => setSheet(null)} title="Speed">
        <div className="flex justify-center gap-2 px-4 pb-4">
          {RECORD_SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => {
                draft.setSpeed(s);
                if (videoRef.current) videoRef.current.playbackRate = s;
              }}
              className={cn("px-4 py-2 rounded-full text-sm font-semibold border", draft.speed === s ? "bg-white text-black border-white" : "border-border text-white")}
            >
              {s}x
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "filters"} onClose={() => setSheet(null)} title="Filters">
        <div className="flex gap-3 px-4 pb-4 overflow-x-auto no-scrollbar">
          {FILTER_PRESETS.map((f) => (
            <button key={f.id} onClick={() => draft.setFilterId(f.id)} className="flex flex-col items-center gap-1.5 shrink-0">
              <span
                className={cn("w-14 h-14 rounded-xl bg-gradient-brand-diag border-2", draft.filterId === f.id ? "border-white" : "border-transparent")}
                style={{ filter: f.css || undefined }}
              />
              <span className="text-xs text-white">{f.label}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "beauty"} onClose={() => setSheet(null)} title="Beauty">
        <div className="px-4 pb-6">
          <input
            type="range"
            min={0}
            max={100}
            value={draft.beauty}
            onChange={(e) => draft.setBeauty(Number(e.target.value))}
            className="w-full accent-fliq-magenta"
            aria-label="Beauty intensity"
          />
          <p className="text-center text-muted text-sm mt-2">{draft.beauty}%</p>
        </div>
      </Sheet>

      <Sheet open={sheet === "export"} onClose={() => setSheet(null)} title="Export settings">
        <div className="px-4 pb-6 flex flex-col gap-5">
          <div>
            <p className="text-white text-sm font-semibold mb-2">Resolution</p>
            <div className="flex gap-2">
              {EXPORT_RES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setExportRes(r)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border", exportRes.id === r.id ? "bg-white text-black border-white" : "border-border text-white")}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white text-sm font-semibold mb-2">Frame rate</p>
            <div className="flex gap-2">
              {FPS_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFps(f)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border", fps === f ? "bg-white text-black border-white" : "border-border text-white")}
                >
                  {f} FPS
                </button>
              ))}
            </div>
          </div>
          {draft.clips.length > 1 && (
            <div>
              <p className="text-white text-sm font-semibold mb-2">Transition between clips</p>
              <div className="flex gap-2">
                {(["cut", "fade"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => draft.setTransition(t)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border capitalize", draft.transition === t ? "bg-white text-black border-white" : "border-border text-white")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Sheet>

      {baking && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex flex-col items-center justify-center gap-3">
          <div className="w-40 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-gradient-brand-horizontal transition-[width]" style={{ width: `${bakeProgress}%` }} />
          </div>
          <p className="text-white text-sm">Processing your video... {Math.round(bakeProgress)}%</p>
        </div>
      )}
    </div>
  );
}

function EditorTool({
  icon: Icon,
  label,
  active,
  danger,
  onClick,
}: {
  icon: typeof Type;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
      <span className={cn("w-11 h-11 rounded-full flex items-center justify-center", danger ? "bg-danger text-white" : active ? "bg-white text-black" : "bg-surface-3 text-white")}>
        <Icon size={18} />
      </span>
      <span className="text-[10px] text-white text-center leading-tight">{label}</span>
    </button>
  );
}

function TextComposer({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="px-4 pb-4 flex gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit(value)}
        placeholder="Type something..."
        aria-label="Text overlay content"
        className="flex-1 bg-surface-2 border border-border rounded-full px-4 py-2.5 text-sm text-white outline-none"
      />
      <Button onClick={() => onSubmit(value)} disabled={!value.trim()}>
        Add
      </Button>
    </div>
  );
}
