import { Global, Module } from '@nestjs/common';
import { MonitorService } from './services/monitor.service';
import { LoggerService } from './logger.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [MonitorService, LoggerService, RateLimitGuard],
  exports: [MonitorService, LoggerService, RateLimitGuard],
})
export class CommonModule {}
