"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Button } from "@/components/ui/Button";
import { UserMinus } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

export default function DeactivateAccountPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/deactivate", { method: "POST" });
      if (!res.ok) throw new Error();
      setUser(null);
      toast("success", "Your account has been deactivated");
      router.push("/welcome");
      router.refresh();
    } catch {
      toast("error", "Couldn't deactivate your account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsSubpage title="Deactivate Account">
      <div className="px-4 flex flex-col items-center text-center gap-4 py-6">
        <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center">
          <UserMinus size={28} className="text-warning" />
        </div>
        <div>
          <p className="text-white font-semibold">Deactivating is temporary</p>
          <p className="text-muted text-sm mt-1.5 max-w-xs">
            Your profile, videos, and comments will be hidden until you log back in. Nothing is deleted.
          </p>
        </div>
        <Button variant="danger" fullWidth onClick={handleDeactivate} loading={loading}>
          Deactivate my account
        </Button>
      </div>
    </SettingsSubpage>
  );
}
