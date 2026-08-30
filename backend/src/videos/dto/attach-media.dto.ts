import { IsIn, IsString } from 'class-validator';
import { UPLOAD_KINDS } from './request-upload.dto.js';
import type { UploadKind } from './request-upload.dto.js';

export class AttachMediaDto {
  @IsIn(UPLOAD_KINDS)
  kind!: UploadKind;

  @IsString()
  key!: string;
}
