import { Module } from '@nestjs/common';
import { VideosService } from './videos.service.js';
import { VideosController } from './videos.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
