import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({
  name: z.string().min(1).max(60),
  usernames: z.array(z.string()).min(2).max(49),
});

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("A group needs a name and at least 2 other people", 422);

  const members = await prisma.user.findMany({ where: { username: { in: parsed.data.usernames.map((u) => u.toLowerCase()) } } });
  const memberIds = members.map((m) => m.id).filter((id) => id !== user.id);
  if (memberIds.length < 2) return jsonError("Add at least 2 other people to start a group", 422);

  const blocked = await prisma.blockedUser.findMany({
    where: { OR: [{ blockerId: user.id, blockedId: { in: memberIds } }, { blockerId: { in: memberIds }, blockedId: user.id }] },
  });
  const blockedIds = new Set(blocked.flatMap((b) => [b.blockerId, b.blockedId]));
  const allowedIds = memberIds.filter((id) => !blockedIds.has(id));
  if (allowedIds.length < 2) return jsonError("At least 2 of the people you added aren't reachable", 422);

  const conversation = await prisma.conversation.create({
    data: {
      isGroup: true,
      name: parsed.data.name.trim(),
      participants: {
        create: [{ userId: user.id, role: "owner" }, ...allowedIds.map((id) => ({ userId: id, role: "member" }))],
      },
    },
  });

  return jsonOk({ conversationId: conversation.id }, 201);
});
