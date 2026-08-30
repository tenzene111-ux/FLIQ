import { Module } from '@nestjs/common';
import { HashtagsService } from './hashtags.service.js';
import { HashtagsController } from './hashtags.controller.js';

@Module({
  controllers: [HashtagsController],
  providers: [HashtagsService],
  exports: [HashtagsService],
})
export class HashtagsModule {}
