import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideosService } from './videos.service.js';
import { VideosController } from './videos.controller.js';
import { ViewsProcessor } from './views.processor.js';
import { EncodeProcessor } from './encode.processor.js';
import { VIDEO_VIEWS_QUEUE, VIDEO_ENCODE_QUEUE } from './queue-names.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: VIDEO_VIEWS_QUEUE }, { name: VIDEO_ENCODE_QUEUE }),
  ],
  controllers: [VideosController],
  providers: [VideosService, ViewsProcessor, EncodeProcessor],
  exports: [VideosService],
})
export class VideosModule {}
