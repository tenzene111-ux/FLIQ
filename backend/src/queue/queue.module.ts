import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

// Wires BullMQ to the same Redis instance as everything else. Feature
// modules register their own named queues (BullModule.registerQueue) on
// top of this shared connection config.
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // BullMQ needs its own connection (separate from RedisService's)
        // with maxRetriesPerRequest disabled — it issues blocking commands
        // that a retry limit would otherwise break.
        connection: new Redis(config.getOrThrow<string>('REDIS_URL'), { maxRetriesPerRequest: null }),
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
