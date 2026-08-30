import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Talks to any S3-compatible object store through one client — Cloudflare
// R2, AWS S3, or (in dev) a local S3-compatible test server. Swapping
// providers is an env change (STORAGE_ENDPOINT/STORAGE_REGION/credentials),
// never a code change.
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('STORAGE_BUCKET');
    this.publicUrl = this.configService.getOrThrow<string>('STORAGE_PUBLIC_URL').replace(/\/$/, '');

    const endpoint = this.configService.get<string>('STORAGE_ENDPOINT');
    this.client = new S3Client({
      region: this.configService.get<string>('STORAGE_REGION') ?? 'auto',
      endpoint: endpoint || undefined,
      forcePathStyle: this.configService.get<string>('STORAGE_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('STORAGE_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('STORAGE_SECRET_ACCESS_KEY'),
      },
    });
  }

  // Signs a short-lived PUT URL locally (no network round trip) — the
  // client uploads the file bytes directly to storage, never through our API.
  async getUploadUrl(key: string, contentType: string, expiresInSeconds = 300): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  // Confirms the object is actually there before the API trusts a client's
  // claim that an upload finished.
  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  // Server-side download — used by the encode worker to pull the raw
  // upload down for FFmpeg to read locally. Buffers the whole object,
  // which is fine for short-form video source files; a very large source
  // would want streaming instead.
  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  // Server-side upload — used by the encode worker to push HLS output
  // back to storage. Unlike getUploadUrl, this goes straight through our
  // own storage credentials rather than a client-facing presigned URL.
  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }
}
