"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, AtSign, Hash, RefreshCcw, Trash2, Repeat } from "lucide-react";
import { useCreateDraftStore } from "@/store/create-draft";
import { useAuthStore } from "@/store/auth";
import { Textarea, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/store/toast";
import { extractHashtags, extractMentions, cn } from "@/lib/utils";
import type { VideoDTO } from "@/types/models";

const PRIVACY_OPTIONS = [
  { id: "everyone", label: "Everyone" },
  { id: "followers", label: "Followers" },
  { id: "onlyMe", label: "Only me" },
] as const;

function PostPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");
  const draft = useCreateDraftStore();
  const user = useAuthStore((s) => s.user);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [privacy, setPrivacy] = useState<(typeof PRIVACY_OPTIONS)[number]["id"]>("everyone");
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const [resumedVideo, setResumedVideo] = useState<VideoDTO | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(!!draftId);

  useEffect(() => {
    if (draftId) {
      fetch(`/api/videos/${draftId}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.video) throw new Error();
          setResumedVideo(d.video);
          setCaption(d.video.caption || "");
          setLocation(d.video.location || "");
          setPrivacy(d.video.privacy || "everyone");
          setAllowComments(d.video.allowComments);
          setAllowDuet(d.video.allowDuet);
          setAllowDownload(d.video.allowDownload);
        })
        .catch(() => {
          toast("error", "Couldn't load that draft");
          router.replace("/create");
        })
        .finally(() => setLoadingDraft(false));
      return;
    }
    if (!draft.finalBlobUrl) {
      router.replace("/create");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const previewSrc = resumedVideo?.videoUrl ?? draft.finalBlobUrl ?? undefined;
  const hashtags = extractHashtags(caption);
  const mentions = extractMentions(caption);

  async function handlePost(saveAsDraft: boolean) {
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      if (draftId) {
        const res = await fetch(`/api/videos/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption,
            location,
            privacy,
            allowComments,
            allowDuet,
            allowDownload,
            status: saveAsDraft ? "draft" : "published",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't save");
        toast("success", saveAsDraft ? "Draft saved" : "Posted to Fliq!");
        router.push(`/profile/${user?.username}`);
        return;
      }

      if (!draft.finalBlobUrl) return;
      const videoBlob = await fetch(draft.finalBlobUrl).then((r) => r.blob());
      const form = new FormData();
      form.append("video", videoBlob, "video.webm");
      form.append("caption", caption);
      form.append("location", location);
      form.append("privacy", privacy);
      form.append("allowComments", String(allowComments));
      form.append("allowDuet", String(allowDuet));
      form.append("allowDownload", String(allowDownload));
      form.append("duration", String(Math.round(draft.finalDuration || 15)));
      form.append("status", saveAsDraft ? "draft" : "published");
      if (draft.soundId) form.append("soundId", draft.soundId);
      if (draft.coverDataUrl) form.append("cover", draft.coverDataUrl);
      if (draft.duetOfId) form.append("duetOfId", draft.duetOfId);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/videos");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              reject(new Error(JSON.parse(xhr.responseText).error || "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Check your connection and try again."));
        xhr.send(form);
      });

      toast("success", saveAsDraft ? "Saved to your drafts" : "Posted to Fliq!");
      draft.reset();
      router.push(`/profile/${user?.username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDraft() {
    if (!draftId) return;
    if (!window.confirm("Delete this draft? This can't be undone.")) return;
    await fetch(`/api/videos/${draftId}`, { method: "DELETE" }).catch(() => {});
    toast("success", "Draft deleted");
    router.push(`/profile/${user?.username}`);
  }

  function pickCoverFrame(time: number) {
    const v = document.createElement("video");
    v.src = draft.finalBlobUrl!;
    v.muted = true;
    v.onloadeddata = () => {
      v.currentTime = time;
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
    };
  }

  if (loadingDraft) return null;
  if (!draftId && !draft.finalBlobUrl) return null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-3 sticky top-0 bg-background/95 backdrop-blur z-10">
        <button onClick={() => router.back()} className="text-white" aria-label="Back" disabled={uploading}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-semibold text-base flex-1">{draftId ? "Edit draft" : "New post"}</h1>
        {draftId && (
          <button onClick={handleDeleteDraft} className="text-danger" aria-label="Delete draft" disabled={uploading}>
            <Trash2 size={19} />
          </button>
        )}
      </div>

      <div className="px-4 flex gap-4">
        <div className="flex flex-col gap-2 shrink-0">
          <div className="relative w-28 aspect-[9/16] rounded-xl overflow-hidden bg-surface-2 border border-border">
            <video
              ref={videoRef}
              src={previewSrc}
              className="w-full h-full object-cover"
              muted
              loop
              autoPlay
              playsInline
              poster={draft.coverDataUrl ?? resumedVideo?.thumbnailUrl ?? undefined}
            />
          </div>
          {!draftId && (
            <button onClick={() => setCoverPickerOpen((v) => !v)} className="text-xs text-fliq-cyan text-center">
              Edit cover
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {draft.duetOfId && draft.duetOfUsername && (
            <p className="text-xs text-fliq-cyan flex items-center gap-1">
              <Repeat size={12} /> Duet with @{draft.duetOfUsername}
            </p>
          )}
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tell everyone about your video..."
            rows={5}
            maxLength={2200}
            aria-label="Caption"
          />
          {(hashtags.length > 0 || mentions.length > 0) && (
            <div className="flex flex-wrap gap-1.5 -mt-1">
              {hashtags.map((h) => (
                <span key={h} className="text-[11px] text-fliq-cyan flex items-center gap-0.5">
                  <Hash size={10} />
                  {h}
                </span>
              ))}
              {mentions.map((m) => (
                <span key={m} className="text-[11px] text-fliq-cyan flex items-center gap-0.5">
                  <AtSign size={10} />
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {coverPickerOpen && (
        <div className="px-4 mt-3">
          <p className="text-xs text-muted mb-1.5">Drag to choose a cover frame</p>
          <input
            type="range"
            min={0}
            max={Math.max(1, draft.finalDuration)}
            step={0.1}
            defaultValue={0}
            onChange={(e) => pickCoverFrame(Number(e.target.value))}
            className="w-full accent-fliq-magenta"
            aria-label="Cover frame"
          />
        </div>
      )}

      <div className="px-4 mt-6 flex flex-col gap-1 divide-y divide-border">
        {!draftId && (
          <Row icon={Hash} label="Add sound">
            <span className="text-sm text-muted truncate max-w-[140px]">{draft.soundLabel ?? "None selected"}</span>
          </Row>
        )}
        <Row icon={MapPin} label="Location">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" className="w-40 py-1.5" />
        </Row>
      </div>

      <div className="px-4 mt-2">
        <p className="text-white text-sm font-semibold mb-2">Who can watch this video</p>
        <div className="flex gap-2">
          {PRIVACY_OPTIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPrivacy(p.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold border",
                privacy === p.id ? "bg-white text-black border-white" : "border-border text-white"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6 flex flex-col gap-4">
        <ToggleRow label="Allow comments" value={allowComments} onChange={setAllowComments} />
        <ToggleRow label="Allow duet & repost" value={allowDuet} onChange={setAllowDuet} />
        <ToggleRow label="Allow downloads" value={allowDownload} onChange={setAllowDownload} />
      </div>

      {error && (
        <div className="px-4 mt-4">
          <p className="text-danger text-sm flex items-center gap-1.5">
            <RefreshCcw size={13} /> {error}
          </p>
        </div>
      )}

      <div className="px-4 mt-8 flex flex-col gap-2">
        {uploading && (
          <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden mb-1">
            <div className="h-full bg-gradient-brand-horizontal transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        )}
        <Button fullWidth size="lg" loading={uploading} onClick={() => handlePost(false)}>
          {uploading ? `Posting... ${progress}%` : "Post to Fliq"}
        </Button>
        <Button fullWidth size="lg" variant="secondary" disabled={uploading} onClick={() => handlePost(true)}>
          Save draft
        </Button>
      </div>
    </div>
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={null}>
      <PostPageInner />
    </Suspense>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  if (!label) return null;
  return (
    <div className="flex items-center justify-between py-3">
      <span className="flex items-center gap-2.5 text-white text-sm">
        <Icon size={17} className="text-muted-2" />
        {label}
      </span>
      {children}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white text-sm">{label}</span>
      <Switch checked={value} onChange={onChange} label={label} />
    </div>
  );
}
