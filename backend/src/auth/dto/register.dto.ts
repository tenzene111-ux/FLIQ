import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72) // bcrypt silently truncates beyond 72 bytes
  password!: string;

  @IsString()
  @Matches(/^[a-z0-9_.]{3,20}$/i, {
    message: 'Username must be 3-20 characters: letters, numbers, "_" or "."',
  })
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  displayName!: string;
}
