import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PlanEnforcementService } from './plan-enforcement.service';

/**
 * Centralized feature gating based on tenant plan.
 * Use before analytics, AI pricing, or other premium features.
 */
@Injectable()
export class FeatureService {
  constructor(private readonly planEnforcement: PlanEnforcementService) {}

  /** Assert tenant has access to analytics. Throws ForbiddenException if not. */
  async assertAnalytics(tenantId: string): Promise<void> {
    const limits = await this.planEnforcement.getPlanLimits(tenantId);
    if (!limits.features.analytics) {
      throw new ForbiddenException(
        'Analytics is a premium feature. Upgrade your plan to access analytics.',
      );
    }
  }

  /** Assert tenant has access to AI pricing. */
  async assertAIPricing(tenantId: string): Promise<void> {
    const limits = await this.planEnforcement.getPlanLimits(tenantId);
    if (!limits.features.aiPricing) {
      throw new ForbiddenException(
        'AI pricing is a premium feature. Upgrade your plan to enable it.',
      );
    }
  }

  /** Check if tenant has a feature (non-throwing) */
  async hasFeature(tenantId: string, feature: string): Promise<boolean> {
    const limits = await this.planEnforcement.getPlanLimits(tenantId);
    return !!limits.features[feature];
  }

  /** Get all feature flags for tenant */
  async getFeatures(tenantId: string): Promise<Record<string, boolean>> {
    const limits = await this.planEnforcement.getPlanLimits(tenantId);
    return limits.features;
  }
}
