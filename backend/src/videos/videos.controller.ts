import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VideosService } from './videos.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { ListVideosQuery } from './dto/list-videos.query.js';
import { RequestUploadDto } from './dto/request-upload.dto.js';
import { AttachMediaDto } from './dto/attach-media.dto.js';
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
    await this.videosService.queueViewIncrement(id);
    return video;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/upload-url')
  async requestUpload(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: RequestUploadDto,
  ) {
    return this.videosService.requestUpload(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/attach-media')
  async attachMedia(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AttachMediaDto,
  ) {
    return this.videosService.attachMedia(id, user.id, dto);
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
