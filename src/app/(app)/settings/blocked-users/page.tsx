"use client";

import { useEffect, useState } from "react";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { UserX } from "lucide-react";
import { toast } from "@/store/toast";

interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export default function BlockedUsersPage() {
  const [users, setUsers] = useState<BlockedUser[] | null>(null);

  function load() {
    fetch("/api/users/blocked")
      .then((r) => r.json())
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]));
  }

  useEffect(load, []);

  async function unblock(username: string) {
    setUsers((prev) => prev?.filter((u) => u.username !== username) ?? null);
    await fetch(`/api/users/${username}/block`, { method: "DELETE" }).catch(() => {});
    toast("success", `Unblocked @${username}`);
  }

  return (
    <SettingsSubpage title="Blocked Users">
      {users === null ? (
        Array.from({ length: 3 }).map((_, i) => <ListRowSkeleton key={i} />)
      ) : users.length === 0 ? (
        <EmptyState icon={UserX} title="No blocked users" description="Users you block will appear here." />
      ) : (
        users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar src={u.avatarUrl} alt={u.displayName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{u.displayName}</p>
              <p className="text-muted-2 text-xs truncate">@{u.username}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => unblock(u.username)}>
              Unblock
            </Button>
          </div>
        ))
      )}
    </SettingsSubpage>
  );
}
