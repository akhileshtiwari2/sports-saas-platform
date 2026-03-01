import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { FacilityModule } from './facility/facility.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StripeModule } from './payments/stripe.module';
import { AIPricingModule } from './ai-pricing/ai-pricing.module';
import { AuditModule } from './audit/audit.module';
import { RefundModule } from './refund/refund.module';
import { CommissionModule } from './commission/commission.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TenantsModule } from './tenants/tenants.module';
import { CoachesModule } from './coaches/coaches.module';
import { LessonsModule } from './lessons/lessons.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { HealthModule } from './health/health.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

function validateEnv(env: Record<string, unknown>) {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'CORS_ORIGINS',
    'FRONTEND_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ] as const;

  for (const key of required) {
    const value = env[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${key} is required`);
    }
  }

  const stripeKey = String(env.STRIPE_SECRET_KEY);
  if (!stripeKey.startsWith('sk_test_') && env.NODE_ENV !== 'production') {
    throw new Error('STRIPE_SECRET_KEY must be a sandbox key (sk_test_) outside production');
  }

  return env;
}

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    FacilityModule,
    BookingModule,
    StripeModule,
    AIPricingModule,
    AuditModule,
    RefundModule,
    CommissionModule,
    AnalyticsModule,
    TenantsModule,
    CoachesModule,
    LessonsModule,
    SubscriptionsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
