import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlanEnforcementService } from './plan-enforcement.service';
import { FeatureService } from './feature.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../payments/stripe.module';

@Module({
  imports: [PrismaModule, forwardRef(() => StripeModule)],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PlanEnforcementService, FeatureService],
  exports: [SubscriptionsService, PlanEnforcementService, FeatureService],
})
export class SubscriptionsModule {}
