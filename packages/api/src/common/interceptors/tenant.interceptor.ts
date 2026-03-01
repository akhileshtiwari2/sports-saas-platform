import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Injects tenantId from JWT-validated user into request.
 * SECURITY: tenantId is NEVER from client - only from req.user (set by JwtStrategy).
 * Runs after guards, so req.user exists for authenticated routes.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    if (req.user?.tenantId) {
      req.tenantId = req.user.tenantId;
    }
    return next.handle();
  }
}
