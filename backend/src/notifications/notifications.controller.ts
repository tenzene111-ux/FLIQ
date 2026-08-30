import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { ListNotificationsQuery } from './dto/list-notifications.query.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { RequestUser } from '../auth/jwt.strategy.js';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser, @Query() query: ListNotificationsQuery) {
    return this.notificationsService.listForUser(user.id, query);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: RequestUser) {
    return { count: await this.notificationsService.unreadCount(user.id) };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: RequestUser) {
    await this.notificationsService.markAllRead(user.id);
    return { ok: true };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.notificationsService.markRead(id, user.id);
    return { ok: true };
  }
}
