// Ranked hierarchy: a higher role always has at least the access of the
// ones below it (moderator >= user, admin >= moderator, etc).
export const ROLE_RANK: Record<string, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

export function roleAtLeast(role: string, minimum: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minimum] ?? 0);
}
