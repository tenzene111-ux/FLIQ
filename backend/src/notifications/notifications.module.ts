import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsProcessor } from './notifications.processor.js';
import { ConsoleNotificationSender } from './notification-sender.js';
import { NOTIFICATIONS_QUEUE } from './queue-names.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor, ConsoleNotificationSender],
  exports: [NotificationsService],
})
export class NotificationsModule {}
