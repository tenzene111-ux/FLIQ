import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FollowsService } from './follows.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { RequestUser } from '../auth/jwt.strategy.js';

@Controller()
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('follows/:userId')
  async follow(@Param('userId') userId: string, @CurrentUser() user: RequestUser) {
    return this.followsService.follow(user.id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('follows/:userId')
  async unfollow(@Param('userId') userId: string, @CurrentUser() user: RequestUser) {
    return this.followsService.unfollow(user.id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('follows/:userId/status')
  async status(@Param('userId') userId: string, @CurrentUser() user: RequestUser) {
    return this.followsService.isFollowing(user.id, userId);
  }

  @Get('users/:userId/followers')
  async followers(@Param('userId') userId: string) {
    return this.followsService.listFollowers(userId);
  }

  @Get('users/:userId/following')
  async following(@Param('userId') userId: string) {
    return this.followsService.listFollowing(userId);
  }
}
