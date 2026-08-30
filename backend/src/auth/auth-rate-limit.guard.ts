import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

// 10 attempts/minute per IP+route, enforced in Redis (not per-process
// memory) so the limit holds across multiple API instances.
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = `ratelimit:${request.route?.path ?? request.url}:${request.ip}`;
    const count = await this.redis.incrWithExpire(key, 60_000);
    if (count > 10) {
      throw new HttpException('Too many attempts. Try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
