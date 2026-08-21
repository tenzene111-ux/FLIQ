"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { formatCount } from "@/lib/utils";

export interface UserRowData {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  isVerified: boolean;
  followerCount?: number;
}

export function UserRow({
  user,
  following,
  onToggleFollow,
  subtitle,
  linkToProfile = true,
}: {
  user: UserRowData;
  following: boolean;
  onToggleFollow: () => void;
  subtitle?: string;
  linkToProfile?: boolean;
}) {
  const identity = (
    <>
      <Avatar src={user.avatarUrl} alt={user.displayName} size="md" verified={user.isVerified} />
      <div className="min-w-0 flex-1">
        <p className="text-white text-sm font-semibold truncate">{user.displayName}</p>
        <p className="text-muted-2 text-xs truncate">
          @{user.username}
          {subtitle ? ` · ${subtitle}` : user.followerCount !== undefined ? ` · ${formatCount(user.followerCount)} followers` : ""}
        </p>
      </div>
    </>
  );

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {linkToProfile ? (
        <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
          {identity}
        </Link>
      ) : (
        <div className="flex items-center gap-3 flex-1 min-w-0">{identity}</div>
      )}
      <Button size="sm" variant={following ? "secondary" : "primary"} onClick={onToggleFollow} className="shrink-0">
        {following ? "Following" : "Follow"}
      </Button>
    </div>
  );
}
