import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UPLOAD_KINDS } from './request-upload.dto.js';
import type { UploadKind } from './request-upload.dto.js';

export class AttachMediaDto {
  @IsIn(UPLOAD_KINDS)
  kind!: UploadKind;

  @IsString()
  key!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;
}
