import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getStorage, MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import { prisma } from "@/lib/db";

export const POST = withAuth(async (req, { user }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("An image file is required", 422);
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return jsonError("Unsupported image type", 415);
  if (file.size > MAX_IMAGE_BYTES) return jsonError("Image is too large (max 15MB)", 413);

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1] || "jpg";
  const { url } = await getStorage().upload(buffer, { folder: "avatars", ext, contentType: file.type });

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: url } });

  return jsonOk({ url });
});
