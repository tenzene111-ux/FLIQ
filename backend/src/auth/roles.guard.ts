import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';
import { ROLE_RANK } from './role-rank.js';
import type { RequestUser } from './jwt.strategy.js';

// Ranked, not an exact-match allowlist: @Roles('moderator') is satisfied by
// moderator, admin, or super_admin — a higher role always has at least the
// access of the ones below it.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user: RequestUser = context.switchToHttp().getRequest().user;
    const userRank = ROLE_RANK[user.role] ?? 0;
    const minRequiredRank = Math.min(...requiredRoles.map((r) => ROLE_RANK[r] ?? 0));

    if (userRank < minRequiredRank) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
