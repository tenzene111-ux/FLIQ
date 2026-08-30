import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { NotificationsService, NotifyInput } from './notifications.service.js';
import { ConsoleNotificationSender } from './notification-sender.js';
import { NOTIFICATIONS_QUEUE } from './queue-names.js';
import { PrismaService } from '../prisma/prisma.service.js';

const MESSAGE_BY_TYPE: Record<NotifyInput['type'], (actor: string) => string> = {
  like: (actor) => `${actor} liked your video`,
  comment: (actor) => `${actor} commented on your video`,
  follow: (actor) => `${actor} started following you`,
};

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sender: ConsoleNotificationSender,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<NotifyInput>): Promise<void> {
    const input = job.data;
    await this.notificationsService.persist(input);

    const actor = await this.prisma.user.findUnique({
      where: { id: input.actorId },
      select: { username: true },
    });
    if (!actor) return; // actor account no longer exists — nothing to push

    await this.sender.send({
      userId: input.userId,
      title: 'Fliq',
      body: MESSAGE_BY_TYPE[input.type](actor.username),
    });
  }
}
