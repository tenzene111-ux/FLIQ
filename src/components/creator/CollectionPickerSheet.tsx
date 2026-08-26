"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Folder } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/toast";

export interface CollectionSummary {
  id: string;
  name: string;
  count: number;
  coverUrl: string | null;
}

export function CollectionPickerSheet({
  open,
  onClose,
  videoId,
  collections,
  onCollectionsChange,
}: {
  open: boolean;
  onClose: () => void;
  videoId: string;
  collections: CollectionSummary[];
  onCollectionsChange: (collections: CollectionSummary[]) => void;
}) {
  const [memberIds, setMemberIds] = useState<Set<string> | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!open) return;
    setMemberIds(null);
    setCreating(false);
    setNewName("");
    fetch(`/api/videos/${videoId}/collections`)
      .then((r) => r.json())
      .then((d) => setMemberIds(new Set<string>(d.collectionIds || [])))
      .catch(() => setMemberIds(new Set()));
  }, [open, videoId]);

  async function toggle(collection: CollectionSummary) {
    const isMember = memberIds?.has(collection.id) ?? false;
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (isMember) next.delete(collection.id);
      else next.add(collection.id);
      return next;
    });
    onCollectionsChange(
      collections.map((c) => (c.id === collection.id ? { ...c, count: Math.max(0, c.count + (isMember ? -1 : 1)) } : c))
    );
    await fetch(`/api/collections/${collection.id}/items`, {
      method: isMember ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    }).catch(() => {});
  }

  async function createCollection() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setCreating(false);
    if (!res?.ok || !data) {
      toast("error", data?.error || "Couldn't create collection");
      return;
    }
    onCollectionsChange([...collections, data.collection]);
    setNewName("");
    toggle(data.collection);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Save to collection" heightClass="h-[70vh]">
      <div className="px-4 flex gap-2 pb-3">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection name"
          maxLength={40}
          onKeyDown={(e) => e.key === "Enter" && createCollection()}
        />
        <Button size="sm" onClick={createCollection} loading={creating} disabled={!newName.trim()}>
          <Plus size={16} />
        </Button>
      </div>
      {memberIds === null ? (
        <div className="px-4 text-muted-2 text-sm">Loading...</div>
      ) : collections.length === 0 ? (
        <div className="px-4 text-muted-2 text-sm">Create a collection to organize your saved posts.</div>
      ) : (
        collections.map((c) => (
          <button key={c.id} onClick={() => toggle(c)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left">
            <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center overflow-hidden shrink-0">
              {c.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Folder size={18} className="text-muted-2" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{c.name}</p>
              <p className="text-muted-2 text-xs">{c.count} saved</p>
            </div>
            {memberIds.has(c.id) && (
              <span className="w-5 h-5 rounded-full bg-gradient-brand-horizontal flex items-center justify-center shrink-0">
                <Check size={12} className="text-white" />
              </span>
            )}
          </button>
        ))
      )}
    </Sheet>
  );
}
