import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import { RATE_LIMITS, REDIS_KEYS } from '../constants';

export enum RateLimitScope {
  LOGIN = 'login',
  SLOT_LOCK = 'slot_lock',
  PAYMENT_INTENT = 'payment_intent',
}

const SCOPE_LIMITS: Record<RateLimitScope, number> = {
  [RateLimitScope.LOGIN]: RATE_LIMITS.LOGIN_PER_MIN,
  [RateLimitScope.SLOT_LOCK]: RATE_LIMITS.SLOT_LOCK_PER_MIN,
  [RateLimitScope.PAYMENT_INTENT]: RATE_LIMITS.PAYMENT_INTENT_PER_MIN,
};

type RequestWithUser = Request & { user?: { sub?: string } };

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scope = this.reflector.get<RateLimitScope>('rateLimit', context.getHandler());
    if (!scope) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const limit = SCOPE_LIMITS[scope];
    const windowSec = 60;

    const key = this.getKey(scope, req);
    const redisKey = REDIS_KEYS.RATE_LIMIT(key);

    const client = this.redis.getClient();
    const count = await client.incr(redisKey);
    if (count === 1) await client.expire(redisKey, windowSec);

    if (count > limit) {
      throw new HttpException(
        { message: 'Too many requests. Please try again later.', statusCode: HttpStatus.TOO_MANY_REQUESTS },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private getKey(scope: RateLimitScope, req: RequestWithUser): string {
    switch (scope) {
      case RateLimitScope.LOGIN:
        return `login:${req.ip || 'unknown'}`;
      case RateLimitScope.SLOT_LOCK:
      case RateLimitScope.PAYMENT_INTENT: {
        const userId = req.user?.sub;
        return `${scope}:${userId || req.ip || 'anonymous'}`;
      }
      default:
        return `${scope}:${req.ip || 'unknown'}`;
    }
  }
}
