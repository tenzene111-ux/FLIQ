"use client";

// Shared "save as draft" upload used when a user backs out of the camera,
// editor, or photo picker with unsaved work — mirrors the real publish path
// in create/post/page.tsx but always posts with status=draft.

export async function uploadVideoDraft(blob: Blob, opts: { duration: number; coverDataUrl?: string | null; soundId?: string | null }) {
  const form = new FormData();
  form.append("video", blob, "video.webm");
  form.append("duration", String(Math.max(1, Math.round(opts.duration || 1))));
  form.append("status", "draft");
  if (opts.coverDataUrl) form.append("cover", opts.coverDataUrl);
  if (opts.soundId) form.append("soundId", opts.soundId);
  const res = await fetch("/api/videos", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Couldn't save draft");
  }
}

export async function uploadPhotoDraft(files: File[]) {
  const form = new FormData();
  for (const f of files) form.append("photos", f);
  form.append("postType", "photo");
  form.append("status", "draft");
  const res = await fetch("/api/videos", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Couldn't save draft");
  }
}
