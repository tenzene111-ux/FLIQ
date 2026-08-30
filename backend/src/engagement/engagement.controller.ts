import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { LikesService } from './likes.service.js';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { RequestUser } from '../auth/jwt.strategy.js';

@Controller('videos/:videoId')
export class EngagementController {
  constructor(
    private readonly likesService: LikesService,
    private readonly commentsService: CommentsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('like')
  async like(@Param('videoId') videoId: string, @CurrentUser() user: RequestUser) {
    return this.likesService.like(user.id, videoId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('like')
  async unlike(@Param('videoId') videoId: string, @CurrentUser() user: RequestUser) {
    return this.likesService.unlike(user.id, videoId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('like')
  async hasLiked(@Param('videoId') videoId: string, @CurrentUser() user: RequestUser) {
    return this.likesService.hasLiked(user.id, videoId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments')
  async comment(
    @Param('videoId') videoId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(user.id, videoId, dto);
  }

  @Get('comments')
  async listComments(@Param('videoId') videoId: string) {
    return this.commentsService.listForVideo(videoId);
  }
}

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.commentsService.remove(id, user.id);
  }
}
