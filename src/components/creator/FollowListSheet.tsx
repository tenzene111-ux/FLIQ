"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { UserRow, type UserRowData } from "@/components/creator/UserRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { Users } from "lucide-react";
import { useAuthStore } from "@/store/auth";

export function FollowListSheet({
  open,
  onClose,
  username,
  type,
  title,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
  type: "followers" | "following";
  title: string;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<(UserRowData & { isFollowing: boolean })[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setUsers(null);
    fetch(`/api/users/${username}/${type}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]));
  }, [open, username, type]);

  async function toggleFollow(u: UserRowData & { isFollowing: boolean }) {
    setUsers((prev) => prev?.map((x) => (x.id === u.id ? { ...x, isFollowing: !x.isFollowing } : x)) ?? null);
    await fetch(`/api/users/${u.username}/follow`, { method: u.isFollowing ? "DELETE" : "POST" }).catch(() => {});
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} heightClass="h-[75vh]">
      {users === null ? (
        Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title={type === "followers" ? "No followers yet" : "Not following anyone yet"} />
      ) : (
        users.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            following={u.isFollowing}
            onToggleFollow={() => toggleFollow(u)}
            subtitle={currentUser?.id === u.id ? "You" : undefined}
          />
        ))
      )}
    </Sheet>
  );
}
