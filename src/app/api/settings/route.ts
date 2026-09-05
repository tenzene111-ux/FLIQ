import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";

export const GET = withAuth(async (_req, { user }) => {
  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  return jsonOk({ settings });
});

const schema = z.object({
  privateAccount: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  allowDuet: z.boolean().optional(),
  allowStitch: z.boolean().optional(),
  allowDownloads: z.boolean().optional(),
  allowMessagesFrom: z.enum(["everyone", "followers", "none"]).optional(),
  showActivityStatus: z.boolean().optional(),
  readReceipts: z.boolean().optional(),
  pushLikes: z.boolean().optional(),
  pushComments: z.boolean().optional(),
  pushFollowers: z.boolean().optional(),
  pushMentions: z.boolean().optional(),
  pushMessages: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  language: z.string().optional(),
  reducedMotion: z.boolean().optional(),
  theme: z.string().optional(),
  keywordFilters: z.array(z.string().max(60)).max(50).optional(),
});

export const PATCH = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const { keywordFilters, ...data } = parsed.success ? parsed.data : {};

  if (data.privateAccount !== undefined) {
    await prisma.user.update({ where: { id: user.id }, data: { isPrivate: data.privateAccount } });
  }

  const dbData = { ...data, ...(keywordFilters ? { keywordFilters: JSON.stringify(keywordFilters) } : {}) };

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...dbData },
    update: dbData,
  });
  return jsonOk({ settings });
});
