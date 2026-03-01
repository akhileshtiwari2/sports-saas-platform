import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '@repo/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = config.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, isActive: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.isActive === false) throw new UnauthorizedException('User account is deactivated');
    // For staff roles, validate tenantId matches user's tenancy (prevent JWT tampering)
    const staffRoles = ['FACILITY_ADMIN', 'COACH', 'SALES_ADMIN'];
    if (payload.tenantId && staffRoles.includes(payload.role)) {
      const tenancy = await this.prisma.userTenant.findFirst({
        where: { userId: payload.sub, tenantId: payload.tenantId },
      });
      if (!tenancy) throw new UnauthorizedException('Tenant access denied');
    }
    return { ...payload, ...user };
  }
}
