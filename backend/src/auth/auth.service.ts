import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { parseDurationMs } from './token.util.js';

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  isVerified: boolean;
  role: string;
}

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private toPublicUser(user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    isVerified: boolean;
    role: string;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      isVerified: user.isVerified,
      role: user.role,
    };
  }

  // Refresh tokens are opaque random strings — never JWTs. We store only an
  // HMAC of the raw token (keyed with JWT_REFRESH_SECRET as a pepper), so a
  // stolen database dump alone can't be replayed as a valid session, and
  // revocation is a real DB write, not just waiting out a JWT's expiry.
  private hashRefreshToken(rawToken: string): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (secret) return createHmac('sha256', secret).update(rawToken).digest('hex');
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private async signAccessToken(user: { id: string; email: string; username: string }): Promise<string> {
    return this.jwtService.signAsync({ sub: user.id, email: user.email, username: user.username });
  }

  private async issueRefreshToken(userId: string, meta?: SessionMeta): Promise<string> {
    const rawToken = randomBytes(40).toString('hex');
    const expiresInMs = parseDurationMs(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(rawToken),
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
        expiresAt: new Date(Date.now() + expiresInMs),
      },
    });
    return rawToken;
  }

  async register(dto: RegisterDto, meta?: SessionMeta): Promise<AuthResult> {
    const email = dto.email.toLowerCase();
    const username = dto.username.toLowerCase();

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });
    if (existing) {
      if (existing.email === email) throw new ConflictException('Email is already registered');
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email, username, passwordHash, displayName: dto.displayName },
    });

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.issueRefreshToken(user.id, meta),
    ]);

    return { user: this.toPublicUser(user), accessToken, refreshToken };
  }

  async login(dto: LoginDto, meta?: SessionMeta): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== 'active') {
      throw new ForbiddenException('This account is not active');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.issueRefreshToken(user.id, meta),
    ]);

    return { user: this.toPublicUser(user), accessToken, refreshToken };
  }

  async refresh(rawRefreshToken: string, meta?: SessionMeta): Promise<AuthResult> {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (stored.user.status !== 'active') {
      throw new ForbiddenException('This account is not active');
    }

    // Rotate: revoke the presented token and issue a fresh one, so a leaked
    // refresh token is only usable once before it's dead.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(stored.user),
      this.issueRefreshToken(stored.user.id, meta),
    ]);

    return { user: this.toPublicUser(stored.user), accessToken, refreshToken };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    // Best-effort revoke; a missing/already-revoked token isn't an error —
    // the end state (no live session for this token) is what logout wants.
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User no longer exists');
    return this.toPublicUser(user);
  }
}
