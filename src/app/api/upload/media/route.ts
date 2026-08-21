import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getStorage, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from "@/lib/storage";

const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"];

export const POST = withAuth(async (req) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("A file is required", 422);

  let kind: "image" | "video" | "audio";
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) kind = "image";
  else if (ALLOWED_VIDEO_TYPES.includes(file.type)) kind = "video";
  else if (ALLOWED_AUDIO_TYPES.includes(file.type)) kind = "audio";
  else return jsonError("Unsupported file type", 415);

  const limit = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) return jsonError("File is too large", 413);

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1]?.split(";")[0] || "bin";
  const { url } = await getStorage().upload(buffer, { folder: `chat/${kind}`, ext, contentType: file.type });

  return jsonOk({ url, kind });
});
