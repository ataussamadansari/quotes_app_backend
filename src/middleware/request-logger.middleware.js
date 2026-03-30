import { logger } from '../utils/logger.js';

export const requestLogger = (request, response, next) => {
  const startedAt = process.hrtime.bigint();

  response.on('finish', () => {
    const durationInMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const metadata = {
      event: 'http_request',
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationInMs: Number(durationInMs.toFixed(2)),
      ip: request.ip,
      userAgent: request.get('user-agent') || undefined,
      userId: request.user?.id ? String(request.user.id) : undefined,
      userRole: request.user?.role,
    };

    if (response.statusCode >= 500) {
      logger.error('HTTP request completed with server error.', metadata);
      return;
    }

    if (response.statusCode >= 400) {
      logger.warn('HTTP request completed with client error.', metadata);
      return;
    }

    logger.info('HTTP request completed.', metadata);
  });

  next();
};
