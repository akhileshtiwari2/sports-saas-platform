import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, type JwtPayload } from '@repo/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenancies: { include: { tenant: true } } },
    });
    if (!user || !user.passwordHash) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const tenancy = user.tenancies[0]; // Primary tenancy
    const tenancyRole = tenancy?.role as unknown as UserRole | undefined;
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: tenancyRole ?? UserRole.CUSTOMER,
      tenantId: tenancy?.tenantId,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: payload.role,
        tenantId: payload.tenantId,
      },
    };
  }

  async register(
    email: string,
    password: string,
    name: string,
    role?: UserRole,
  ) {
    // SECURITY: Prevent public registration of privileged roles
    const allowedRoles = [UserRole.CUSTOMER, UserRole.COACH];
    const effectiveRole = role && allowedRoles.includes(role) ? role : UserRole.CUSTOMER;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Email already registered');

    const hash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        name,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: effectiveRole,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: effectiveRole,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenancies: { include: { tenant: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
