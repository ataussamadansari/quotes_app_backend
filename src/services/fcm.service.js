import { getFirebaseMessagingClient, isFirebaseMessagingEnabled } from '../config/firebase-admin.js';
import { env } from '../config/env.js';
import User from '../models/user.model.js';

const MAX_MULTICAST_TOKENS = 500;
const MAX_TOPIC_TOKENS = 1000;
const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

const chunkArray = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const deduplicateTokens = (tokens) =>
  [...new Set(tokens.map((token) => token.trim()).filter(Boolean))];

const removeInvalidTokens = async (tokens) => {
  const normalizedTokens = deduplicateTokens(tokens);

  if (normalizedTokens.length === 0) {
    return;
  }

  await User.updateMany(
    {},
    {
      $pull: {
        fcmTokens: {
          token: { $in: normalizedTokens },
        },
      },
    },
  );
};

const buildNotificationMessage = ({ title, body, data = {}, imageUrl }) => {
  const normalizedData = Object.entries(data).reduce((accumulator, [key, value]) => {
    if (value === undefined || value === null) {
      return accumulator;
    }

    accumulator[key] = String(value);
    return accumulator;
  }, {});

  const message = {
    notification: {
      title,
      body,
    },
    data: normalizedData,
  };

  if (imageUrl) {
    message.notification.imageUrl = imageUrl;
  }

  return message;
};

export const subscribeTokensToGlobalTopic = async (tokens) => {
  if (!isFirebaseMessagingEnabled() || !env.fcmAutoSubscribeGlobalTopic) {
    return { successCount: 0, failureCount: 0 };
  }

  const normalizedTokens = deduplicateTokens(tokens);

  if (normalizedTokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const messaging = getFirebaseMessagingClient();
  let successCount = 0;
  let failureCount = 0;

  for (const batch of chunkArray(normalizedTokens, MAX_TOPIC_TOKENS)) {
    const response = await messaging.subscribeToTopic(batch, env.fcmGlobalTopic);
    successCount += response.successCount;
    failureCount += response.failureCount;
  }

  return { successCount, failureCount };
};

export const unsubscribeTokensFromGlobalTopic = async (tokens) => {
  if (!isFirebaseMessagingEnabled() || !env.fcmAutoSubscribeGlobalTopic) {
    return { successCount: 0, failureCount: 0 };
  }

  const normalizedTokens = deduplicateTokens(tokens);

  if (normalizedTokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const messaging = getFirebaseMessagingClient();
  let successCount = 0;
  let failureCount = 0;

  for (const batch of chunkArray(normalizedTokens, MAX_TOPIC_TOKENS)) {
    const response = await messaging.unsubscribeFromTopic(batch, env.fcmGlobalTopic);
    successCount += response.successCount;
    failureCount += response.failureCount;
  }

  return { successCount, failureCount };
};

export const sendNotificationToToken = async ({ token, title, body, data, imageUrl }) => {
  if (!isFirebaseMessagingEnabled()) {
    return {
      successCount: 0,
      failureCount: 0,
      skipped: true,
    };
  }

  const normalizedTokens = deduplicateTokens([token]);

  if (normalizedTokens.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      skipped: true,
    };
  }

  const messaging = getFirebaseMessagingClient();
  const message = buildNotificationMessage({ title, body, data, imageUrl });

  try {
    const messageId = await messaging.send({
      ...message,
      token: normalizedTokens[0],
    });

    return {
      successCount: 1,
      failureCount: 0,
      skipped: false,
      messageIds: [messageId],
      invalidTokens: [],
    };
  } catch (error) {
    const invalidTokens = INVALID_TOKEN_CODES.has(error.code) ? normalizedTokens : [];

    if (invalidTokens.length > 0) {
      await removeInvalidTokens(invalidTokens);
    }

    return {
      successCount: 0,
      failureCount: 1,
      skipped: false,
      invalidTokens,
      errorCodes: [error.code ?? 'unknown'],
      failureReason: error.message,
    };
  }
};

export const sendNotificationToTokens = async ({ tokens, title, body, data, imageUrl }) => {
  if (!isFirebaseMessagingEnabled()) {
    return {
      successCount: 0,
      failureCount: 0,
      skipped: true,
      invalidTokens: [],
    };
  }

  const normalizedTokens = deduplicateTokens(tokens ?? []);

  if (normalizedTokens.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      skipped: true,
      invalidTokens: [],
    };
  }

  const messaging = getFirebaseMessagingClient();
  const message = buildNotificationMessage({ title, body, data, imageUrl });
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = [];
  const errorCodes = [];

  for (const batch of chunkArray(normalizedTokens, MAX_MULTICAST_TOKENS)) {
    const response = await messaging.sendEachForMulticast({
      ...message,
      tokens: batch,
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((sendResponse, index) => {
      if (!sendResponse.success) {
        const errorCode = sendResponse.error?.code ?? 'unknown';
        errorCodes.push(errorCode);

        if (INVALID_TOKEN_CODES.has(errorCode)) {
          invalidTokens.push(batch[index]);
        }
      }
    });
  }

  if (invalidTokens.length > 0) {
    await removeInvalidTokens(invalidTokens);
  }

  return {
    successCount,
    failureCount,
    skipped: false,
    invalidTokens: deduplicateTokens(invalidTokens),
    errorCodes,
  };
};

export const sendNotificationToTopic = async ({ topic, title, body, data, imageUrl }) => {
  if (!isFirebaseMessagingEnabled()) {
    return {
      successCount: 0,
      failureCount: 0,
      skipped: true,
    };
  }

  const messaging = getFirebaseMessagingClient();
  const message = buildNotificationMessage({ title, body, data, imageUrl });
  const messageId = await messaging.send({
    ...message,
    topic,
  });

  return {
    successCount: 1,
    failureCount: 0,
    skipped: false,
    messageIds: [messageId],
  };
};

export const getUserTokens = async (userIds) => {
  const users = await User.find({
    _id: { $in: userIds },
    isActive: true,
  }).lean();

  return users.flatMap((user) =>
    Array.isArray(user.fcmTokens) ? user.fcmTokens.map((device) => device.token) : [],
  );
};

