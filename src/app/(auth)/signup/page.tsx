"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FliqLogo } from "@/components/ui/FliqLogo";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { Eye, EyeOff } from "lucide-react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, displayName: username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setUser(data.user);
      toast("success", "Welcome to Fliq!");
      router.push("/onboarding/interests");
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
        <h1 className="text-2xl font-bold text-white text-center">Create your account</h1>
        <p className="text-muted text-sm text-center mt-1.5">Join Fliq and start sharing your world.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder="yourname"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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
            Sign up
          </Button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-2">or sign up with</span>
          <div className="h-px bg-border flex-1" />
        </div>
        <OAuthButtons />

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-white font-semibold hover:text-fliq-cyan">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
