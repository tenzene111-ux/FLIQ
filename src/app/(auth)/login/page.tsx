"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FliqLogo } from "@/components/ui/FliqLogo";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setUser(data.user);
      toast("success", `Welcome back, ${data.user.displayName}!`);
      router.push("/home");
      router.refresh();
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setIdentifier("demo@fliq.app");
    setPassword("Password123!");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <FliqLogo />
        </div>
        <h1 className="text-2xl font-bold text-white text-center">Welcome back</h1>
        <p className="text-muted text-sm text-center mt-1.5">Log in to continue watching, creating, sharing.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <Label htmlFor="identifier">Email or username</Label>
            <Input
              id="identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="password" className="mb-0">
                Password
              </Label>
              <Link href="/forgot-password" className="text-xs text-fliq-cyan hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-danger text-sm" role="alert">{error}</p>}

          <Button type="submit" size="lg" fullWidth loading={loading} className="mt-2">
            Log in
          </Button>
        </form>

        <button
          onClick={fillDemo}
          type="button"
          className="w-full text-center text-xs text-muted-2 hover:text-white mt-4 transition-colors"
        >
          Use demo account (demo@fliq.app)
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-2">or continue with</span>
          <div className="h-px bg-border flex-1" />
        </div>
        <OAuthButtons />

        <p className="text-center text-sm text-muted mt-6">
          New to Fliq?{" "}
          <Link href="/signup" className="text-white font-semibold hover:text-fliq-cyan">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
