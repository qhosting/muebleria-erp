
import Redis from 'ioredis';

const redisUrl = process.env.REDIS || 'redis://localhost:6379';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
