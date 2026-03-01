import { SetMetadata } from '@nestjs/common';
import { RateLimitScope } from '../guards/rate-limit.guard';

export const RateLimit = (scope: RateLimitScope) => SetMetadata('rateLimit', scope);
