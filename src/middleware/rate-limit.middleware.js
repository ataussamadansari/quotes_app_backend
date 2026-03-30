import { rateLimit } from 'express-rate-limit';

import { env } from '../config/env.js';

const buildRateLimiter = ({ identifier, limit, message, windowMs, skip }) =>
  rateLimit({
    identifier,
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ipv6Subnet: 56,
    requestPropertyName: 'rateLimit',
    skip,
    handler: (_request, response) => {
      response.status(429).json({
        success: false,
        message,
      });
    },
  });

export const apiRateLimiter = buildRateLimiter({
  identifier: 'global-api',
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMaxRequests,
  message: 'Too many requests. Please try again later.',
  skip: (request) => request.path.startsWith('/health'),
});

export const authRateLimiter = buildRateLimiter({
  identifier: 'auth',
  windowMs: env.authRateLimitWindowMs,
  limit: env.authRateLimitMaxRequests,
  message: 'Too many authentication attempts. Please try again later.',
});

export const adminNotificationRateLimiter = buildRateLimiter({
  identifier: 'admin-notification-send',
  windowMs: env.adminNotificationRateLimitWindowMs,
  limit: env.adminNotificationRateLimitMaxRequests,
  message: 'Too many notification send attempts. Please try again later.',
});
