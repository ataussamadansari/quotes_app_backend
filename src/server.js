import http from 'node:http';

import app from './app.js';
import { ensureAdminAccount } from './bootstrap/seed-admin.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { initializeFirebaseAdmin } from './config/firebase-admin.js';
import { markShuttingDown } from './config/runtime.js';
import { logger } from './utils/logger.js';

const server = http.createServer(app);
let isShuttingDown = false;

const forceShutdownTimer = () => {
  const timeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing process exit.', {
      event: 'shutdown_timeout',
      timeoutInMs: env.shutdownTimeoutMs,
    });
    process.exit(1);
  }, env.shutdownTimeoutMs);

  timeout.unref();
  return timeout;
};

const startServer = async () => {
  await connectDatabase();
  initializeFirebaseAdmin();
  await ensureAdminAccount();

  server.listen(env.port, '0.0.0.0', () => {
    logger.info('HTTP server started.', {
      event: 'server_started',
      port: env.port,
      environment: env.nodeEnv,
    });
  });
};

const shutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  markShuttingDown(signal);
  logger.warn('Shutdown signal received. Starting graceful shutdown.', {
    event: 'shutdown_started',
    signal,
  });

  const timeout = forceShutdownTimer();

  server.close(async (serverError) => {
    clearTimeout(timeout);

    if (serverError) {
      logger.error('HTTP server shutdown failed.', {
        event: 'server_shutdown_failed',
        error: serverError,
      });
      process.exit(1);
    }

    try {
      await disconnectDatabase();
      logger.info('Graceful shutdown completed.', {
        event: 'shutdown_completed',
        signal,
      });
      process.exit(0);
    } catch (databaseError) {
      logger.error('Database shutdown failed.', {
        event: 'database_shutdown_failed',
        error: databaseError,
      });
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection detected.', {
    event: 'unhandled_rejection',
    error: reason,
  });
  void shutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception detected.', {
    event: 'uncaught_exception',
    error,
  });
  void shutdown('UNCAUGHT_EXCEPTION');
});

try {
  await startServer();
} catch (error) {
  logger.error('Application startup failed.', {
    event: 'startup_failed',
    error,
  });
  process.exit(1);
}
