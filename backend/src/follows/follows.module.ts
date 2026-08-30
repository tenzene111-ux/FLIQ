import { Module } from '@nestjs/common';
import { FollowsService } from './follows.service.js';
import { FollowsController } from './follows.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [FollowsController],
  providers: [FollowsService],
})
export class FollowsModule {}
