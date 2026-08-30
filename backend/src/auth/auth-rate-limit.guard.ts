import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { rateLimit } from '../common/rate-limit.util.js';

// 10 attempts/minute per IP+route is generous for a real user, tight enough
// to blunt credential-stuffing / registration-spam against these endpoints.
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = `${request.route?.path ?? request.url}:${request.ip}`;
    if (!rateLimit(key, 10, 60_000)) {
      throw new HttpException('Too many attempts. Try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
