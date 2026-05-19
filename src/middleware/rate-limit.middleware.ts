import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../lib/redis';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // ioredis returns unknown; rate-limit-redis expects RedisReply — safe cast
    sendCommand: (command: string, ...args: string[]) =>
      redis.call(command, ...args) as Promise<never>,
  }),
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      code: 'RATE_LIMITED',
    });
  },
});
