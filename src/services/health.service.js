import { env } from '../config/env.js';
import { getDatabaseStatus } from '../config/database.js';
import { getRuntimeState, isShuttingDown } from '../config/runtime.js';

const formatMemoryUsage = () => {
  const usage = process.memoryUsage();

  return {
    rssInMb: Number((usage.rss / 1024 / 1024).toFixed(2)),
    heapUsedInMb: Number((usage.heapUsed / 1024 / 1024).toFixed(2)),
    heapTotalInMb: Number((usage.heapTotal / 1024 / 1024).toFixed(2)),
  };
};

export const getHealthStatus = () => ({
  status: 'ok',
  service: env.appName,
  environment: env.nodeEnv,
  timestamp: new Date().toISOString(),
  uptimeInSeconds: Math.floor(process.uptime()),
  processId: process.pid,
  memoryUsage: formatMemoryUsage(),
});

export const getReadinessStatus = () => {
  const database = getDatabaseStatus();
  const runtime = getRuntimeState();
  const ready = database.isConnected && !isShuttingDown();

  return {
    status: ready ? 'ready' : 'not_ready',
    service: env.appName,
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: database,
      fcm: {
        enabled: env.fcmEnabled,
      },
    },
    runtime: {
      startedAt: runtime.startedAt.toISOString(),
      shuttingDown: runtime.shuttingDown,
      shutdownSignal: runtime.shutdownSignal,
      shutdownStartedAt: runtime.shutdownStartedAt?.toISOString() ?? null,
    },
  };
};
