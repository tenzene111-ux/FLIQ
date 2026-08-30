import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVideoDto {
  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string;
}
