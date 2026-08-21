"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

export default function DeleteAccountPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirmText === user?.username;

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setUser(null);
      toast("success", "Your account has been deleted");
      router.push("/welcome");
      router.refresh();
    } catch {
      toast("error", "Couldn't delete your account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsSubpage title="Delete Account">
      <div className="px-4 flex flex-col items-center text-center gap-4 py-6">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
          <Trash2 size={28} className="text-danger" />
        </div>
        <div>
          <p className="text-white font-semibold">This can&apos;t be undone</p>
          <p className="text-muted text-sm mt-1.5 max-w-xs">
            All your videos, comments, messages, and profile data will be permanently deleted.
          </p>
        </div>
        <div className="w-full text-left">
          <Label htmlFor="confirm">
            Type <span className="text-white font-semibold">{user?.username}</span> to confirm
          </Label>
          <Input id="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={user?.username} />
        </div>
        <Button variant="danger" fullWidth onClick={handleDelete} loading={loading} disabled={!canDelete}>
          Permanently delete my account
        </Button>
      </div>
    </SettingsSubpage>
  );
}
