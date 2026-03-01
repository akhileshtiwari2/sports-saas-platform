import { Module } from '@nestjs/common';
import { AIPricingService } from './ai-pricing.service';
import { AIPricingController } from './ai-pricing.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [AIPricingController],
  providers: [AIPricingService],
  exports: [AIPricingService],
})
export class AIPricingModule {}
