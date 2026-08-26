"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { useCreateDraftStore } from "@/store/create-draft";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/toast";
import { uploadPhotoDraft } from "@/lib/save-draft";
import { trackCreateEvent } from "@/lib/create-events";
import { DraftExitSheet } from "@/components/create/DraftExitSheet";
import { useAuthStore } from "@/store/auth";

const MAX_PHOTOS = 10;

export default function PhotosPickerPage() {
  const router = useRouter();
  const draft = useCreateDraftStore();
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [exitOpen, setExitOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    draft.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p));
  }, [previews]);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) return;
    const room = MAX_PHOTOS - files.length;
    if (picked.length > room) {
      toast("info", `Only the first ${room} photo(s) were added (max ${MAX_PHOTOS} per post)`);
    }
    const toAdd = picked.slice(0, room);
    setFiles((f) => [...f, ...toAdd]);
    setPreviews((p) => [...p, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removeAt(i: number) {
    URL.revokeObjectURL(previews[i]);
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  function handleNext() {
    if (files.length === 0) return;
    draft.setPhotos(files, previews);
    router.push("/create/post");
  }

  function requestBack() {
    if (files.length > 0) {
      setExitOpen(true);
    } else {
      router.back();
    }
  }

  async function saveDraftAndExit() {
    setSavingDraft(true);
    try {
      await uploadPhotoDraft(files);
      trackCreateEvent("DRAFT_SAVED", { from: "photos" });
      toast("success", "Saved to your drafts");
      router.push(`/profile/${user?.username}`);
    } catch {
      toast("error", "Couldn't save that draft");
    } finally {
      setSavingDraft(false);
      setExitOpen(false);
    }
  }

  function discardAndExit() {
    trackCreateEvent("POST_CANCELLED", { from: "photos" });
    setExitOpen(false);
    router.push("/home");
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-3">
        <button onClick={requestBack} className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-semibold text-base">New photo post</h1>
      </div>

      <div className="px-4 pt-2">
        <p className="text-muted text-sm mb-3">
          {files.length === 0 ? "Choose up to 10 photos to post as a swipeable set." : `${files.length} photo${files.length > 1 ? "s" : ""} selected`}
        </p>

        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square rounded-lg overflow-hidden bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Cover</span>
              )}
              <button
                onClick={() => removeAt(i)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {files.length < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-border-strong flex flex-col items-center justify-center gap-1 text-muted-2 hover:text-white hover:border-border-strong"
            >
              <ImagePlus size={22} />
              <span className="text-xs">Add</span>
            </button>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSelect} />
      </div>

      <div className="px-4 mt-8">
        <Button fullWidth size="lg" disabled={files.length === 0} onClick={handleNext}>
          Next
        </Button>
      </div>

      <DraftExitSheet open={exitOpen} onClose={() => setExitOpen(false)} onSave={saveDraftAndExit} onDiscard={discardAndExit} saving={savingDraft} kind="photos" />
    </div>
  );
}
