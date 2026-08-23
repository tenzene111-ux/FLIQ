import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

/**
 * Storage abstraction so the rest of the app never talks to a specific
 * provider directly.
 *
 * - "local" (default): writes to /public/uploads. Only works where the
 *   filesystem is writable and persistent — fine for local dev, NOT for
 *   Vercel/serverless (read-only, ephemeral filesystem at runtime).
 * - "vercel-blob": set STORAGE_PROVIDER=vercel-blob and add the Vercel Blob
 *   storage integration to your project (Vercel dashboard → Storage → add
 *   Blob) — it injects BLOB_READ_WRITE_TOKEN automatically, no manual setup.
 * - "s3": seam kept for a self-hosted S3-compatible bucket.
 */
export interface StorageProvider {
  upload(buffer: Buffer, opts: { folder: string; ext: string; contentType: string }): Promise<{ url: string; key: string }>;
}

class LocalStorageProvider implements StorageProvider {
  async upload(buffer: Buffer, opts: { folder: string; ext: string; contentType: string }) {
    const dir = path.join(process.cwd(), "public", "uploads", opts.folder);
    await mkdir(dir, { recursive: true });
    const filename = `${nanoid(12)}.${opts.ext}`;
    const key = `${opts.folder}/${filename}`;
    await writeFile(path.join(dir, filename), buffer);
    return { url: `/uploads/${key}`, key };
  }
}

class VercelBlobStorageProvider implements StorageProvider {
  async upload(buffer: Buffer, opts: { folder: string; ext: string; contentType: string }) {
    const { put } = await import("@vercel/blob");
    const key = `${opts.folder}/${nanoid(12)}.${opts.ext}`;
    const blob = await put(key, buffer, { access: "public", contentType: opts.contentType, addRandomSuffix: false });
    return { url: blob.url, key };
  }
}

class S3StorageProvider implements StorageProvider {
  async upload(): Promise<{ url: string; key: string }> {
    // Production integration point: install @aws-sdk/client-s3 and PUT the
    // object using S3_BUCKET / S3_REGION / S3_ACCESS_KEY_ID /
    // S3_SECRET_ACCESS_KEY, then return the S3_PUBLIC_CDN_URL-prefixed URL.
    // Kept as a clean seam rather than a hardcoded credential path.
    throw new Error(
      "S3 storage provider is not configured in this environment. Set STORAGE_PROVIDER=local for development, or implement the S3 seam in src/lib/storage.ts."
    );
  }
}

export function getStorage(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "local";
  if (provider === "vercel-blob") return new VercelBlobStorageProvider();
  if (provider === "s3") return new S3StorageProvider();
  return new LocalStorageProvider();
}

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
