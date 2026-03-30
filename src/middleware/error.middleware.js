import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error.';
  let errors;

  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed.';
    errors = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    statusCode = 400;
    message = 'Invalid JSON payload.';
  }

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors)
      .map((entry) => entry.message)
      .join(', ');
  }

  if (error.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${error.path}.`;
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = 'A resource with the same unique field already exists.';
  }

  if (statusCode >= 500) {
    logger.error('Unhandled application error.', {
      event: 'application_error',
      method: request.method,
      path: request.originalUrl,
      statusCode,
      error,
    });
  }

  const payload = {
    success: false,
    message,
  };

  if (errors) {
    payload.errors = errors;
  }

  if (env.nodeEnv !== 'production' && error.stack) {
    payload.stack = error.stack;
  }

  response.status(statusCode).json(payload);
};
