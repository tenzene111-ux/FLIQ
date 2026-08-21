"use client";

import Link from "next/link";
import { useState } from "react";
import { FliqLogo } from "@/components/ui/FliqLogo";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ArrowLeft, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setSent(true);
      if (data.devToken) setDevLink(`/reset-password?token=${data.devToken}`);
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <FliqLogo />
        </div>

        {!sent ? (
          <>
            <h1 className="text-2xl font-bold text-white text-center">Reset your password</h1>
            <p className="text-muted text-sm text-center mt-1.5">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              {error && <p className="text-danger text-sm" role="alert">{error}</p>}
              <Button type="submit" size="lg" fullWidth loading={loading}>
                Send reset link
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-fliq-cyan/10 border border-fliq-cyan/20 flex items-center justify-center">
              <MailCheck size={28} className="text-fliq-cyan" />
            </div>
            <h1 className="text-xl font-bold text-white">Check your email</h1>
            <p className="text-muted text-sm max-w-xs">
              If an account exists for <span className="text-white">{email}</span>, a reset link is on its way.
            </p>
            {devLink && (
              <div className="glass rounded-xl p-3 mt-2 w-full">
                <p className="text-xs text-muted-2 mb-1.5">Dev mode — no real inbox here, use this link:</p>
                <Link href={devLink} className="text-fliq-cyan text-sm font-medium hover:underline break-all">
                  {devLink}
                </Link>
              </div>
            )}
          </div>
        )}

        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted hover:text-white mt-6">
          <ArrowLeft size={15} />
          Back to log in
        </Link>
      </div>
    </div>
  );
}
