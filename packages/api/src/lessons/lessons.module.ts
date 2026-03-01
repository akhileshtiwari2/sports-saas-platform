import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StripeModule } from '../payments/stripe.module';

@Module({
  imports: [SubscriptionsModule, StripeModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
