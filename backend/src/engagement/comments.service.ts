import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, videoId: string, dto: CreateCommentDto) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video || video.status === 'removed') throw new NotFoundException('Video not found');

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: { userId, videoId, text: dto.text },
        include: { user: { select: { id: true, username: true, displayName: true } } },
      }),
      this.prisma.video.update({ where: { id: videoId }, data: { commentCount: { increment: 1 } } }),
    ]);
    await this.notifications.notify({
      userId: video.userId,
      actorId: userId,
      type: 'comment',
      videoId,
      commentId: comment.id,
    });
    return comment;
  }

  async listForVideo(videoId: string) {
    return this.prisma.comment.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true, displayName: true } } },
    });
  }

  async remove(commentId: string, requesterId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { video: { select: { userId: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const isOwnComment = comment.userId === requesterId;
    const isVideoOwner = comment.video.userId === requesterId;
    if (!isOwnComment && !isVideoOwner) throw new ForbiddenException("Can't delete this comment");

    await this.prisma.$transaction([
      this.prisma.comment.delete({ where: { id: commentId } }),
      this.prisma.video.update({ where: { id: comment.videoId }, data: { commentCount: { decrement: 1 } } }),
    ]);
    return { ok: true };
  }
}
