"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FliqLogo } from "@/components/ui/FliqLogo";
import { Button } from "@/components/ui/Button";
import { UserRow, type UserRowData } from "@/components/creator/UserRow";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export default function OnboardingCreatorsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<(UserRowData & { followerCount: number })[] | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/users/suggested")
      .then((r) => r.json())
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]));
  }, []);

  async function toggleFollow(username: string) {
    const isFollowing = following.has(username);
    setFollowing((prev) => {
      const next = new Set(prev);
      isFollowing ? next.delete(username) : next.add(username);
      return next;
    });
    await fetch(`/api/users/${username}/follow`, { method: isFollowing ? "DELETE" : "POST" }).catch(() => {});
  }

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md flex flex-col flex-1">
        <div className="flex justify-center mb-6">
          <FliqLogo />
        </div>

        <div className="flex items-center gap-1.5 mb-6 justify-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all", i === 1 ? "w-8 bg-gradient-brand-horizontal" : "w-4 bg-surface-3")} />
          ))}
        </div>

        <h1 className="text-2xl font-bold text-white text-center">Follow creators you&apos;ll love</h1>
        <p className="text-muted text-sm text-center mt-1.5">Based on your interests. You can always follow more later.</p>

        <div className="mt-6 -mx-2 rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {users === null &&
            Array.from({ length: 5 }).map((_, i) => <ListRowSkeleton key={i} />)}
          {users?.map((u) => (
            <UserRow key={u.id} user={u} following={following.has(u.username)} onToggleFollow={() => toggleFollow(u.username)} />
          ))}
        </div>

        <div className="mt-auto pt-8">
          <Button size="lg" fullWidth onClick={() => router.push("/onboarding/notifications")}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
