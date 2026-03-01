import { Module } from '@nestjs/common';
import { FacilityController } from './facility.controller';
import { CourtController } from './court.controller';
import { SlotController } from './slot.controller';
import { FacilityService } from './facility.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [FacilityController, CourtController, SlotController],
  providers: [FacilityService],
  exports: [FacilityService],
})
export class FacilityModule {}
