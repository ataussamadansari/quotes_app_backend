import mongoose from 'mongoose';

import {
  DEVICE_PLATFORMS,
  MAX_FCM_DEVICES_PER_USER,
} from '../constants/fcm.js';
import User from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import {
  sanitizeFcmDevice,
  sanitizePublicUser,
  sanitizeUser,
} from '../utils/sanitize-user.js';
import {
  subscribeTokensToGlobalTopic,
  unsubscribeTokensFromGlobalTopic,
} from './fcm.service.js';

const allowedPlatforms = new Set(Object.values(DEVICE_PLATFORMS));
const allowedAvatarProtocols = new Set(['http:', 'https:']);

const getUserOrThrow = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError('User id is invalid.', 400);
  }

  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new AppError('User not found.', 404);
  }

  return user;
};

const normalizePayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Request body must be a JSON object.', 400);
  }

  return payload;
};

const normalizeName = (name) => {
  if (typeof name !== 'string' || name.trim().length < 2) {
    throw new AppError('Name must be at least 2 characters long.', 400);
  }

  return name.trim();
};

const normalizeOptionalBio = (bio) => {
  if (bio === undefined) {
    return undefined;
  }

  if (bio === null) {
    return null;
  }

  if (typeof bio !== 'string') {
    throw new AppError('Bio must be a string.', 400);
  }

  const normalizedBio = bio.trim();

  if (!normalizedBio) {
    return null;
  }

  if (normalizedBio.length > 280) {
    throw new AppError('Bio must not exceed 280 characters.', 400);
  }

  return normalizedBio;
};

const normalizeOptionalAvatarUrl = (avatarUrl) => {
  if (avatarUrl === undefined) {
    return undefined;
  }

  if (avatarUrl === null) {
    return null;
  }

  if (typeof avatarUrl !== 'string') {
    throw new AppError('avatarUrl must be a string.', 400);
  }

  const normalizedAvatarUrl = avatarUrl.trim();

  if (!normalizedAvatarUrl) {
    return null;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(normalizedAvatarUrl);
  } catch {
    throw new AppError('avatarUrl must be a valid URL.', 400);
  }

  if (!allowedAvatarProtocols.has(parsedUrl.protocol)) {
    throw new AppError('avatarUrl must use http or https.', 400);
  }

  return parsedUrl.toString();
};

const normalizeDeviceId = (deviceId) => {
  if (typeof deviceId !== 'string' || !deviceId.trim()) {
    throw new AppError('deviceId is required.', 400);
  }

  const normalizedDeviceId = deviceId.trim();

  if (normalizedDeviceId.length > 120) {
    throw new AppError('deviceId must not exceed 120 characters.', 400);
  }

  return normalizedDeviceId;
};

const normalizeFcmToken = (token) => {
  if (typeof token !== 'string' || !token.trim()) {
    throw new AppError('FCM token is required.', 400);
  }

  const normalizedToken = token.trim();

  if (normalizedToken.length > 512) {
    throw new AppError('FCM token must not exceed 512 characters.', 400);
  }

  return normalizedToken;
};

const normalizePlatform = (platform) => {
  if (platform === undefined || platform === null || platform === '') {
    return DEVICE_PLATFORMS.UNKNOWN;
  }

  if (typeof platform !== 'string') {
    throw new AppError('platform must be a string.', 400);
  }

  const normalizedPlatform = platform.trim().toLowerCase();

  if (!allowedPlatforms.has(normalizedPlatform)) {
    throw new AppError('platform must be android, ios, web, or unknown.', 400);
  }

  return normalizedPlatform;
};

export const getOwnProfile = async (userId) => {
  const user = await getUserOrThrow(userId);

  return {
    user: sanitizeUser(user),
  };
};

export const updateOwnProfile = async (userId, payload) => {
  const requestPayload = normalizePayload(payload);
  const user = await getUserOrThrow(userId);
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(requestPayload, 'name')) {
    updates.name = normalizeName(requestPayload.name);
  }

  if (Object.prototype.hasOwnProperty.call(requestPayload, 'bio')) {
    updates.bio = normalizeOptionalBio(requestPayload.bio);
  }

  if (Object.prototype.hasOwnProperty.call(requestPayload, 'avatarUrl')) {
    updates.avatarUrl = normalizeOptionalAvatarUrl(requestPayload.avatarUrl);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(
      'At least one of name, bio, or avatarUrl must be provided.',
      400,
    );
  }

  Object.assign(user, updates);
  await user.save();

  return {
    user: sanitizeUser(user),
  };
};

export const saveUserFcmToken = async (userId, payload) => {
  const requestPayload = normalizePayload(payload);
  const user = await getUserOrThrow(userId);
  const normalizedDeviceId = normalizeDeviceId(requestPayload.deviceId);
  const normalizedToken = normalizeFcmToken(requestPayload.token);
  const normalizedPlatform = normalizePlatform(requestPayload.platform);
  const now = new Date();

  await User.updateMany(
    { _id: { $ne: user._id } },
    { $pull: { fcmTokens: { token: normalizedToken } } },
  );

  const currentDevices = Array.isArray(user.fcmTokens) ? [...user.fcmTokens] : [];
  const previousTokens = currentDevices.map((device) => device.token);
  const existingDevice = currentDevices.find(
    (device) =>
      device.deviceId === normalizedDeviceId || device.token === normalizedToken,
  );

  const nextDevices = currentDevices.filter(
    (device) =>
      device.deviceId !== normalizedDeviceId && device.token !== normalizedToken,
  );

  nextDevices.push({
    deviceId: normalizedDeviceId,
    token: normalizedToken,
    platform: normalizedPlatform,
    createdAt: existingDevice?.createdAt ?? now,
    updatedAt: now,
    lastUsedAt: now,
  });

  nextDevices.sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

  user.fcmTokens = nextDevices.slice(0, MAX_FCM_DEVICES_PER_USER);
  await user.save();

  const nextTokens = user.fcmTokens.map((device) => device.token);
  const removedTokens = [...new Set(previousTokens.filter((token) => !nextTokens.includes(token)))];

  try {
    await subscribeTokensToGlobalTopic([normalizedToken]);

    if (removedTokens.length > 0) {
      await unsubscribeTokensFromGlobalTopic(removedTokens);
    }
  } catch (error) {
    logger.warn('FCM topic subscription sync failed.', {
      event: 'fcm_topic_sync_failed',
      errorMessage: error.message,
      userId: String(user.id),
      deviceId: normalizedDeviceId,
    });
  }

  const savedDevice = user.fcmTokens.find(
    (device) => device.deviceId === normalizedDeviceId,
  );

  return {
    user: sanitizeUser(user),
    fcmDevice: sanitizeFcmDevice(savedDevice),
  };
};

export const getPublicUserDetails = async (userId) => {
  const user = await getUserOrThrow(userId);

  return {
    user: sanitizePublicUser(user),
  };
};

