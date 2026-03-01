import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { SLOT_LOCK_TTL_SECONDS, REDIS_KEYS } from '../common/constants';

const WEBHOOK_IDEMPOTENCY_TTL = 86400; // 24h - Stripe recommends at least 24h
const WEBHOOK_PROCESSING_TTL = 300; // 5m guard for in-flight processing

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL is required');
    }
    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 30000);
        this.logger.warn(`Redis reconnect attempt ${times}, retrying in ${delay}ms`);
        return delay;
      },
      enableReadyCheck: true,
      connectTimeout: 10000,
      keepAlive: 30000,
    });

    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('reconnecting', () => this.logger.warn('Redis reconnecting...'));
    this.client.on('close', () => this.logger.warn('Redis connection closed'));
  }

  async ping(): Promise<void> {
    await this.client.ping();
  }

  /** Check if Stripe webhook event already processed (legacy helper). */
  async isWebhookProcessed(eventId: string): Promise<boolean> {
    const key = `stripe:webhook:${eventId}`;
    const val = await this.client.get(key);
    return val === 'done';
  }

  /** Mark Stripe webhook event as processed (legacy helper). */
  async markWebhookProcessed(eventId: string): Promise<void> {
    const key = `stripe:webhook:${eventId}`;
    await this.client.set(key, 'done', 'EX', WEBHOOK_IDEMPOTENCY_TTL);
  }

  /**
   * Atomically start processing a webhook event:
   * - acquired: caller owns processing
   * - already_processed: replay safe to ignore
   * - in_progress: another worker currently processing
   */
  async beginWebhookProcessing(
    eventId: string,
  ): Promise<'acquired' | 'already_processed' | 'in_progress'> {
    const key = `stripe:webhook:${eventId}`;
    const lock = await this.client.set(key, 'processing', 'EX', WEBHOOK_PROCESSING_TTL, 'NX');
    if (lock === 'OK') return 'acquired';

    const state = await this.client.get(key);
    if (state === 'done') return 'already_processed';
    return 'in_progress';
  }

  /** Finalize webhook processing result as done for replay protection. */
  async finalizeWebhookProcessing(eventId: string): Promise<void> {
    const key = `stripe:webhook:${eventId}`;
    await this.client.set(key, 'done', 'EX', WEBHOOK_IDEMPOTENCY_TTL);
  }

  /** Release in-flight marker after handler failure to allow Stripe retries. */
  async failWebhookProcessing(eventId: string): Promise<void> {
    const key = `stripe:webhook:${eventId}`;
    const script = `
      if redis.call("get", KEYS[1]) == "processing" then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.client.eval(script, 1, key);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  /**
   * Acquire lock for slot - prevents double booking.
   * Keys namespaced by tenantId for multi-tenant isolation.
   * Returns lock token if acquired, null if already locked.
   */
  async acquireSlotLock(
    tenantId: string,
    slotId: string,
    userId: string,
  ): Promise<string | null> {
    const key = REDIS_KEYS.SLOT_LOCK(tenantId, slotId);
    const token = `${userId}:${Date.now()}`;
    const result = await this.client.set(key, token, 'EX', SLOT_LOCK_TTL_SECONDS, 'NX');
    return result === 'OK' ? token : null;
  }

  /**
   * Release lock - must use same token that acquired it.
   */
  async releaseSlotLock(tenantId: string, slotId: string, token: string): Promise<boolean> {
    const key = REDIS_KEYS.SLOT_LOCK(tenantId, slotId);
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.client.eval(script, 1, key, token);
    return result === 1;
  }

  /**
   * Extend lock TTL - call during checkout flow
   */
  async extendSlotLock(tenantId: string, slotId: string, token: string): Promise<boolean> {
    const key = REDIS_KEYS.SLOT_LOCK(tenantId, slotId);
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    const result = await this.client.eval(script, 1, key, token, SLOT_LOCK_TTL_SECONDS);
    return result === 1;
  }

  /**
   * Verify lock: token matches AND tenantId matches (prevents cross-tenant attacks).
   */
  async verifySlotLock(
    tenantId: string,
    slotId: string,
    token: string,
  ): Promise<boolean> {
    const key = REDIS_KEYS.SLOT_LOCK(tenantId, slotId);
    const value = await this.client.get(key);
    return value === token;
  }

  getClient(): Redis {
    return this.client;
  }
}
