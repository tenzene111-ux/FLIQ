"use client";

import { useEffect, useState } from "react";
import { Search, BadgeCheck, Ban, Pause, Play, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";
import { cn, formatCount } from "@/lib/utils";

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isAdmin: boolean;
  status: string;
  online: boolean;
  _count: { videos: number; followers: number };
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-success",
  suspended: "text-warning",
  banned: "text-danger",
  deactivated: "text-muted-2",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  function load() {
    setError(false);
    fetch(`/api/admin/users?q=${encodeURIComponent(query)}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setUsers(d.users))
      .catch(() => setError(true));
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function act(u: AdminUser, action: string) {
    const res = await fetch(`/api/admin/users/${u.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast("error", data.error || "Action failed");
      return;
    }
    setUsers((prev) => prev?.map((x) => (x.id === u.id ? { ...x, ...data.user } : x)) ?? null);
    toast("success", `@${u.username}: ${action} applied`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev?.filter((x) => x.id !== deleteTarget.id) ?? null);
      toast("success", `Deleted @${deleteTarget.username}`);
    } else {
      toast("error", "Couldn't delete user");
    }
    setDeleteTarget(null);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-white text-2xl font-bold mb-1">Users</h1>
      <p className="text-muted text-sm mb-4">Search, verify, suspend, ban or delete accounts.</p>

      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 mb-4 max-w-sm">
        <Search size={16} className="text-muted-2" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search username or email" className="border-none bg-transparent px-1" />
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : users === null ? (
        Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-2 text-xs">
                <th className="px-3 py-2.5 font-medium">User</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Stats</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <Avatar src={u.avatarUrl} alt={u.displayName} size="sm" verified={u.isVerified} />
                        {u.online && <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-success border border-background" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate max-w-[140px]">{u.displayName}</p>
                        <p className="text-muted-2 text-xs truncate max-w-[140px]">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-xs font-semibold capitalize", STATUS_COLORS[u.status])}>{u.status}</span>
                    {u.isAdmin && <span className="ml-1.5 text-[10px] text-fliq-magenta font-bold">ADMIN</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-2 text-xs whitespace-nowrap">
                    {formatCount(u._count.videos)} videos · {formatCount(u._count.followers)} followers
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <IconBtn label={u.isVerified ? "Unverify" : "Verify"} onClick={() => act(u, u.isVerified ? "unverify" : "verify")}>
                        <BadgeCheck size={14} className={u.isVerified ? "text-fliq-cyan" : ""} />
                      </IconBtn>
                      {u.status !== "suspended" ? (
                        <IconBtn label="Suspend" onClick={() => act(u, "suspend")}>
                          <Pause size={14} />
                        </IconBtn>
                      ) : (
                        <IconBtn label="Reactivate" onClick={() => act(u, "activate")}>
                          <Play size={14} />
                        </IconBtn>
                      )}
                      <IconBtn label="Ban" danger onClick={() => act(u, "ban")}>
                        <Ban size={14} />
                      </IconBtn>
                      <IconBtn label="Delete" danger onClick={() => setDeleteTarget(u)}>
                        <Trash2 size={14} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <p className="text-white font-semibold mb-1.5">Delete @{deleteTarget?.username}?</p>
        <p className="text-muted text-sm mb-4">This permanently deletes their account, videos, and data. This can&apos;t be undone.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function IconBtn({ label, danger, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10", danger ? "text-danger" : "text-white")}
    >
      {children}
    </button>
  );
}
