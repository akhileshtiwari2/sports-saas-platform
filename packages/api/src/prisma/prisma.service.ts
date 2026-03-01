import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client. For connection pooling, add ?connection_limit=10 to DATABASE_URL.
 * Prisma uses a connection pool per process; avoid excessive connections in serverless.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Clean database for testing (use with caution)
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;
    // Add soft cleanup logic if needed
  }
}
