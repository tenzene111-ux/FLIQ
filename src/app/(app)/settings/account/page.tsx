"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Mail, ChevronRight } from "lucide-react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={null}>
      <AccountSettingsInner />
    </Suspense>
  );
}

function AccountSettingsInner() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const params = useSearchParams();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const token = params.get("verify");
    if (!token) return;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          patchUser({ emailVerified: true });
          toast("success", "Email verified");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function resendVerification() {
    setSending(true);
    try {
      const res = await fetch("/api/auth/send-verification", { method: "POST" });
      const data = await res.json();
      if (data.devToken) {
        toast("info", `Dev mode: verification link is /settings/account?verify=${data.devToken}`);
      } else {
        toast("success", "Verification email sent");
      }
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;

  return (
    <SettingsSubpage title="Account">
      <div className="px-4 flex flex-col gap-1">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-muted-2" />
            <div>
              <p className="text-white text-sm">{user.email}</p>
              <p className="text-xs text-muted-2 flex items-center gap-1">
                {user.emailVerified ? (
                  <>
                    <BadgeCheck size={12} className="text-success" /> Verified
                  </>
                ) : (
                  "Not verified"
                )}
              </p>
            </div>
          </div>
          {!user.emailVerified && (
            <Button size="sm" variant="secondary" onClick={resendVerification} loading={sending}>
              Verify
            </Button>
          )}
        </div>

        <Link href="/settings/security" className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-white text-sm">Password</span>
          <span className="flex items-center gap-1 text-muted-2 text-sm">
            Change <ChevronRight size={15} />
          </span>
        </Link>

        <div className="flex items-center justify-between py-3">
          <span className="text-white text-sm">Account type</span>
          <span className="text-muted text-sm">{user.isCreator ? "Creator" : "Personal"}</span>
        </div>
      </div>
    </SettingsSubpage>
  );
}
