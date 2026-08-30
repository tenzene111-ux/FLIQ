import { Controller, Get, Param, Query } from '@nestjs/common';
import { HashtagsService } from './hashtags.service.js';
import { ListVideosQuery } from '../videos/dto/list-videos.query.js';

@Controller('hashtags')
export class HashtagsController {
  constructor(private readonly hashtagsService: HashtagsService) {}

  @Get('top')
  async top() {
    return this.hashtagsService.topTags();
  }

  @Get(':tag/videos')
  async videosForTag(@Param('tag') tag: string, @Query() query: ListVideosQuery) {
    return this.hashtagsService.listVideosForTag(tag, query);
  }
}
