import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || '119.29.95.207',
  port: parseInt(process.env.REDIS_PORT || '16397'),
  password: process.env.REDIS_PASSWORD || '123456',
  db: parseInt(process.env.REDIS_DB || '1'),
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('[Redis] 连接错误:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] 已连接');
});

export default redis;
