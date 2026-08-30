import { Module } from '@nestjs/common';
import { FollowsService } from './follows.service.js';
import { FollowsController } from './follows.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [FollowsController],
  providers: [FollowsService],
})
export class FollowsModule {}
