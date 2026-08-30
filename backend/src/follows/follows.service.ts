import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw new BadRequestException("Can't follow yourself");

    const target = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('User not found');

    try {
      await this.prisma.follow.create({ data: { followerId, followingId } });
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) throw new ConflictException('Already following this user');
      throw err;
    }
    return { ok: true };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({ where: { followerId, followingId } });
    return { ok: true };
  }

  async isFollowing(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return { following: !!follow };
  }

  async listFollowers(userId: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: 'desc' },
      include: { follower: { select: { id: true, username: true, displayName: true } } },
    });
    return rows.map((r) => r.follower);
  }

  async listFollowing(userId: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { following: { select: { id: true, username: true, displayName: true } } },
    });
    return rows.map((r) => r.following);
  }

  private isUniqueViolation(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002';
  }
}
