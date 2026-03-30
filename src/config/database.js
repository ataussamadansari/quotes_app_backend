import mongoose from 'mongoose';

import { logger } from '../utils/logger.js';
import { env } from './env.js';

const CONNECTION_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established.', { event: 'mongodb_connected' });
  });

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error.', {
      event: 'mongodb_error',
      error,
    });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected.', { event: 'mongodb_disconnected' });
  });
};

export const getDatabaseStatus = () => ({
  readyState: mongoose.connection.readyState,
  state: CONNECTION_STATES[mongoose.connection.readyState] ?? 'unknown',
  isConnected: mongoose.connection.readyState === 1,
});

export const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  registerConnectionListeners();

  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== 'production',
    maxPoolSize: 10,
  });

  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
};
