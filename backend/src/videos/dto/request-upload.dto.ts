import { IsIn, IsString } from 'class-validator';

export const UPLOAD_KINDS = ['video', 'thumbnail'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const ALLOWED_CONTENT_TYPES: Record<UploadKind, Record<string, string>> = {
  video: { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' },
  thumbnail: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' },
};

export class RequestUploadDto {
  @IsIn(UPLOAD_KINDS)
  kind!: UploadKind;

  @IsString()
  contentType!: string;
}
