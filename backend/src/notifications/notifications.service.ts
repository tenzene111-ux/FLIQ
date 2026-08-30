import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { NOTIFICATIONS_QUEUE } from './queue-names.js';
import { ListNotificationsQuery } from './dto/list-notifications.query.js';

export const NOTIFICATION_TYPES = ['like', 'comment', 'follow'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotifyInput {
  userId: string; // recipient
  actorId: string; // who caused it
  type: NotificationType;
  videoId?: string;
  commentId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  // Called by the event source (like/comment/follow) right after the real
  // action succeeds. Never notifies someone about their own action.
  async notify(input: NotifyInput): Promise<void> {
    if (input.userId === input.actorId) return;
    await this.queue.add('notify', input);
  }

  // Called by NotificationsProcessor — this is the actual DB write.
  async persist(input: NotifyInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId,
        type: input.type,
        videoId: input.videoId,
        commentId: input.commentId,
      },
    });
  }

  async listForUser(userId: string, query: ListNotificationsQuery) {
    const limit = query.limit ?? 20;
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { actor: { select: { id: true, username: true, displayName: true } } },
    });
    return { notifications, nextCursor: notifications.length === limit ? notifications.at(-1)?.id : null };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException("Not this notification's recipient");
    await this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
}
