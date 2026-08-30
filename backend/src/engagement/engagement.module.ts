import { Module } from '@nestjs/common';
import { LikesService } from './likes.service.js';
import { CommentsService } from './comments.service.js';
import { EngagementController, CommentsController } from './engagement.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [EngagementController, CommentsController],
  providers: [LikesService, CommentsService],
})
export class EngagementModule {}
