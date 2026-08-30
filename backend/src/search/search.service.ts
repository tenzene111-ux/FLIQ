import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Postgres ILIKE search — matches the spec's own guidance ("use Postgres
// initially if your user base is small, then move to OpenSearch"). No
// ranking beyond simple ordering; that's what OpenSearch buys you later.
const RESULT_LIMIT = 10;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string) {
    const [users, videos, hashtags] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          status: 'active',
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, username: true, displayName: true, isVerified: true },
        take: RESULT_LIMIT,
      }),
      this.prisma.video.findMany({
        where: { status: 'published', caption: { contains: q, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
        take: RESULT_LIMIT,
        include: { user: { select: { id: true, username: true, displayName: true } } },
      }),
      this.prisma.hashtag.findMany({
        where: { tag: { contains: q.toLowerCase(), mode: 'insensitive' } },
        orderBy: { useCount: 'desc' },
        take: RESULT_LIMIT,
      }),
    ]);
    return { users, videos, hashtags };
  }
}
