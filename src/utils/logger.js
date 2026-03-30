import { env } from '../config/env.js';
import { getRequestContext } from './request-context.js';

const LOG_LEVEL_ORDER = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLogLevel = env.logLevel;

const shouldLog = (level) => LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[currentLogLevel];

const serializeError = (error) => {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
  };
};

const replacer = (_key, value) => {
  if (value instanceof Error) {
    return serializeError(value);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  return value;
};

const normalizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return metadata === undefined ? {} : { value: metadata };
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
};

const writeLog = (level, message, metadata = {}) => {
  if (!shouldLog(level)) {
    return;
  }

  const requestContext = getRequestContext();
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: env.appName,
    environment: env.nodeEnv,
    message,
    ...normalizeMetadata(metadata),
  };

  if (requestContext.requestId) {
    entry.requestId = requestContext.requestId;
  }

  if (requestContext.userId && entry.userId === undefined) {
    entry.userId = requestContext.userId;
  }

  if (requestContext.userRole && entry.userRole === undefined) {
    entry.userRole = requestContext.userRole;
  }

  const serializedEntry = JSON.stringify(entry, replacer);
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${serializedEntry}\n`);
};

export const logger = {
  debug: (message, metadata) => writeLog('debug', message, metadata),
  info: (message, metadata) => writeLog('info', message, metadata),
  warn: (message, metadata) => writeLog('warn', message, metadata),
  error: (message, metadata) => writeLog('error', message, metadata),
};
