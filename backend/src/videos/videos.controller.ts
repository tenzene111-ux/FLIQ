import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VideosService } from './videos.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { ListVideosQuery } from './dto/list-videos.query.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { RequestUser } from '../auth/jwt.strategy.js';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateVideoDto) {
    return this.videosService.create(user.id, dto);
  }

  @Get('feed')
  async feed(@Query() query: ListVideosQuery) {
    return this.videosService.listFeed(query);
  }

  @Get('user/:userId')
  async byUser(@Param('userId') userId: string, @Query() query: ListVideosQuery) {
    return this.videosService.listByUser(userId, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const video = await this.videosService.findPublishedById(id);
    await this.videosService.incrementViewCount(id);
    return video;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/publish')
  async publish(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.videosService.markPublished(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.videosService.remove(id, user.id);
    return { ok: true };
  }
}
