"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FliqLogo } from "@/components/ui/FliqLogo";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-center text-muted text-sm">
        This link is invalid. Request a new one from{" "}
        <Link href="/forgot-password" className="text-fliq-cyan hover:underline">
          here
        </Link>
        .
      </p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-success" />
        </div>
        <h1 className="text-xl font-bold text-white">Password updated</h1>
        <p className="text-muted text-sm">Redirecting you to log in…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-white text-center">Set a new password</h1>
      <p className="text-muted text-sm text-center mt-1.5">Choose a strong password you haven&apos;t used before.</p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
          />
        </div>
        {error && <p className="text-danger text-sm" role="alert">{error}</p>}
        <Button type="submit" size="lg" fullWidth loading={loading} className="mt-2">
          Update password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <FliqLogo />
        </div>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
