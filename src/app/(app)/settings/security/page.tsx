"use client";

import { useState } from "react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/toast";

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast("error", "New passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast("success", "Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsSubpage title="Security">
      <form onSubmit={handleSubmit} className="px-4 flex flex-col gap-4">
        <div>
          <Label htmlFor="current">Current password</Label>
          <Input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="new">New password</Label>
          <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" loading={loading} className="mt-2">
          Update password
        </Button>
      </form>
    </SettingsSubpage>
  );
}
