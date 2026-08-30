import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';
import { RedisModule } from './redis/redis.module.js';
import { QueueModule } from './queue/queue.module.js';
import { AuthModule } from './auth/auth.module.js';
import { VideosModule } from './videos/videos.module.js';
import { FollowsModule } from './follows/follows.module.js';
import { EngagementModule } from './engagement/engagement.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { HashtagsModule } from './hashtags/hashtags.module.js';
import { SearchModule } from './search/search.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    RedisModule,
    QueueModule,
    AuthModule,
    NotificationsModule,
    HashtagsModule,
    SearchModule,
    VideosModule,
    FollowsModule,
    EngagementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
