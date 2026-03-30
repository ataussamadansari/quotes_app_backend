import dotenv from 'dotenv';

dotenv.config();

const VALID_LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error']);

const getRequiredString = (key, fallback) => {
  const value = process.env[key] ?? fallback;

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
};

const getNumber = (key, fallback) => {
  const rawValue = process.env[key] ?? fallback;
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer.`);
  }

  return value;
};

const getOptionalString = (key) => {
  const value = process.env[key];

  if (!value) {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
};

const getBoolean = (key, fallback = 'false') => {
  const rawValue = (process.env[key] ?? fallback).trim().toLowerCase();

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  throw new Error(`Environment variable ${key} must be true or false.`);
};

const parseTrustProxy = (value) => {
  if (value === undefined) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  const numericValue = Number(normalizedValue);

  if (Number.isInteger(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  throw new Error('Environment variable TRUST_PROXY must be true, false, or a non-negative integer.');
};

const parseCorsOrigins = (value) => {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must include at least one allowed origin.');
  }

  return origins;
};

const parseOptionalCsv = (value) => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const getSecret = (key, fallback, minimumLength = 32) => {
  const secret = getRequiredString(key, fallback);

  if (secret.length < minimumLength) {
    throw new Error(
      `Environment variable ${key} must be at least ${minimumLength} characters long.`,
    );
  }

  return secret;
};

const getLogLevel = (key, fallback) => {
  const level = getRequiredString(key, fallback).toLowerCase();

  if (!VALID_LOG_LEVELS.has(level)) {
    throw new Error(
      `Environment variable ${key} must be one of: ${[...VALID_LOG_LEVELS].join(', ')}.`,
    );
  }

  return level;
};

const buildEnv = () => ({
  appName: getRequiredString('APP_NAME', 'quotes-social-app-backend'),
  nodeEnv: process.env.NODE_ENV?.trim() || 'development',
  logLevel: getLogLevel('LOG_LEVEL', process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  port: getNumber('PORT', '5000'),
  apiPrefix: getRequiredString('API_PREFIX', '/api/v1'),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  shutdownTimeoutMs: getNumber('SHUTDOWN_TIMEOUT_MS', '10000'),
  mongoUri: getRequiredString(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017/quotes-social-app',
  ),
  corsOrigins: parseCorsOrigins(
    getRequiredString('CORS_ORIGIN', 'http://localhost:3000'),
  ),
  jwtSecret: getSecret('JWT_SECRET'),
  jwtExpiresIn: getRequiredString('JWT_EXPIRES_IN', '15m'),
  jwtIssuer: getRequiredString('JWT_ISSUER', 'quotes-social-app'),
  jwtAudience: getRequiredString('JWT_AUDIENCE', 'quotes-social-users'),
  bcryptSaltRounds: getNumber('BCRYPT_SALT_ROUNDS', '12'),
  rateLimitWindowMs: getNumber('RATE_LIMIT_WINDOW_MS', '900000'),
  rateLimitMaxRequests: getNumber('RATE_LIMIT_MAX_REQUESTS', '100'),
  authRateLimitWindowMs: getNumber('AUTH_RATE_LIMIT_WINDOW_MS', '900000'),
  authRateLimitMaxRequests: getNumber('AUTH_RATE_LIMIT_MAX_REQUESTS', '10'),
  adminNotificationRateLimitWindowMs: getNumber(
    'ADMIN_NOTIFICATION_RATE_LIMIT_WINDOW_MS',
    '60000',
  ),
  adminNotificationRateLimitMaxRequests: getNumber(
    'ADMIN_NOTIFICATION_RATE_LIMIT_MAX_REQUESTS',
    '20',
  ),
  googleClientIds: parseOptionalCsv(getOptionalString('GOOGLE_CLIENT_IDS')),
  adminSeedName: getOptionalString('ADMIN_NAME'),
  adminSeedEmail: getOptionalString('ADMIN_EMAIL'),
  adminSeedPassword: getOptionalString('ADMIN_PASSWORD'),
  fcmEnabled: getBoolean('FCM_ENABLED', 'false'),
  firebaseUseApplicationDefault: getBoolean(
    'FIREBASE_USE_APPLICATION_DEFAULT',
    'false',
  ),
  firebaseProjectId: getOptionalString('FIREBASE_PROJECT_ID'),
  firebaseClientEmail: getOptionalString('FIREBASE_CLIENT_EMAIL'),
  firebasePrivateKey: getOptionalString('FIREBASE_PRIVATE_KEY'),
  fcmGlobalTopic: getRequiredString('FCM_GLOBAL_TOPIC', 'quotes-social-all-users'),
  fcmAutoSubscribeGlobalTopic: getBoolean(
    'FCM_AUTO_SUBSCRIBE_GLOBAL_TOPIC',
    'true',
  ),
});

const assertEnvironmentSafety = (config) => {
  if (config.jwtSecret.includes('replace-with-a-random-secret')) {
    throw new Error('JWT_SECRET must be replaced with a real secret before the application starts.');
  }

  if (
    config.fcmEnabled &&
    !config.firebaseUseApplicationDefault &&
    (!config.firebaseProjectId || !config.firebaseClientEmail || !config.firebasePrivateKey)
  ) {
    throw new Error(
      'FCM is enabled but Firebase service-account credentials are incomplete.',
    );
  }

  if (config.nodeEnv === 'production' && config.corsOrigins.includes('*')) {
    throw new Error('CORS_ORIGIN must not be a wildcard in production.');
  }

  if (
    config.nodeEnv === 'production' &&
    config.corsOrigins.some((origin) => /localhost|127\.0\.0\.1/i.test(origin))
  ) {
    throw new Error('CORS_ORIGIN must not allow localhost origins in production.');
  }
};

const environment = buildEnv();
assertEnvironmentSafety(environment);

export const env = Object.freeze(environment);
