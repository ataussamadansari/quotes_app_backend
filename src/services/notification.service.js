import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { NOTIFICATION_TYPES, PUSH_STATUSES } from '../constants/notification.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { sanitizeNotification } from '../utils/sanitize-notification.js';
import { logger } from '../utils/logger.js';
import {
  getUserTokens,
  sendNotificationToToken,
  sendNotificationToTokens,
  sendNotificationToTopic,
} from './fcm.service.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const ACTOR_POPULATE = {
  path: 'actor',
  select: 'name role avatarUrl bio createdAt updatedAt',
};

const normalizePayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Request body must be a JSON object.', 400);
  }

  return payload;
};

const parsePositiveInteger = (value, fallback, fieldName) => {
  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new AppError(`${fieldName} must be a positive integer.`, 400);
  }

  return parsedValue;
};

const parsePagination = (query = {}) => {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE, 'page');
  const requestedLimit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, 'limit');
  const limit = Math.min(requestedLimit, MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const parseOptionalBooleanQuery = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    throw new AppError(`${fieldName} must be true or false.`, 400);
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  throw new AppError(`${fieldName} must be true or false.`, 400);
};

const normalizeNotificationId = (notificationId) => {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw new AppError('Notification id is invalid.', 400);
  }

  return notificationId;
};

const normalizeTitle = (title) => {
  if (typeof title !== 'string' || !title.trim()) {
    throw new AppError('title is required.', 400);
  }

  const normalizedTitle = title.trim();

  if (normalizedTitle.length > 120) {
    throw new AppError('title must not exceed 120 characters.', 400);
  }

  return normalizedTitle;
};

const normalizeBody = (body) => {
  if (typeof body !== 'string' || !body.trim()) {
    throw new AppError('body is required.', 400);
  }

  const normalizedBody = body.trim();

  if (normalizedBody.length > 500) {
    throw new AppError('body must not exceed 500 characters.', 400);
  }

  return normalizedBody;
};

const normalizeData = (data) => {
  if (data === undefined) {
    return {};
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AppError('data must be a JSON object.', 400);
  }

  return Object.entries(data).reduce((accumulator, [key, value]) => {
    if (value === undefined || value === null) {
      return accumulator;
    }

    accumulator[String(key)] = String(value);
    return accumulator;
  }, {});
};

const normalizeOptionalImageUrl = (imageUrl) => {
  if (imageUrl === undefined || imageUrl === null || imageUrl === '') {
    return undefined;
  }

  if (typeof imageUrl !== 'string') {
    throw new AppError('imageUrl must be a string.', 400);
  }

  const normalizedImageUrl = imageUrl.trim();

  try {
    const parsed = new URL(normalizedImageUrl);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new AppError('imageUrl must use http or https.', 400);
    }

    return parsed.toString();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('imageUrl must be a valid URL.', 400);
  }
};

const normalizeToken = (token) => {
  if (typeof token !== 'string' || !token.trim()) {
    throw new AppError('token is required.', 400);
  }

  return token.trim();
};

const normalizeUserIds = (userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new AppError('userIds must be a non-empty array.', 400);
  }

  const normalizedUserIds = [...new Set(userIds.map((userId) => String(userId).trim()))];

  if (normalizedUserIds.some((userId) => !mongoose.isValidObjectId(userId))) {
    throw new AppError('Each userId must be a valid id.', 400);
  }

  return normalizedUserIds;
};

const buildDeliveryState = (result) => {
  const attemptedAt = new Date();

  if (result.skipped) {
    return {
      pushStatus: PUSH_STATUSES.SKIPPED,
      pushAttemptedAt: attemptedAt,
      pushSentAt: null,
      pushFailureReason: null,
    };
  }

  if (result.failureCount === 0 && result.successCount > 0) {
    return {
      pushStatus: PUSH_STATUSES.SENT,
      pushAttemptedAt: attemptedAt,
      pushSentAt: attemptedAt,
      pushFailureReason: null,
    };
  }

  return {
    pushStatus: result.successCount > 0 ? PUSH_STATUSES.SENT : PUSH_STATUSES.FAILED,
    pushAttemptedAt: attemptedAt,
    pushSentAt: result.successCount > 0 ? attemptedAt : null,
    pushFailureReason: result.failureReason ?? result.errorCodes?.join(', ') ?? null,
  };
};

const createNotificationRecord = async ({
  recipientUserId,
  actorUserId,
  quoteId,
  commentId,
  type,
  title,
  body,
  data,
}) =>
  Notification.create({
    recipient: recipientUserId,
    actor: actorUserId ?? null,
    quote: quoteId ?? null,
    comment: commentId ?? null,
    type,
    title,
    body,
    data,
  });

const updateNotificationDelivery = async (notificationId, result) => {
  await Notification.findByIdAndUpdate(notificationId, buildDeliveryState(result), {
    new: false,
  });
};

const buildFailureResult = (error) => ({
  successCount: 0,
  failureCount: 1,
  skipped: false,
  errorCodes: [error?.code ?? 'unknown'],
  failureReason: error?.message ?? 'Unknown FCM delivery failure.',
});

const getNotificationForRecipientOrThrow = async (notificationId, recipientUserId) => {
  const normalizedNotificationId = normalizeNotificationId(notificationId);

  const notification = await Notification.findOne({
    _id: normalizedNotificationId,
    recipient: recipientUserId,
  }).populate(ACTOR_POPULATE);

  if (!notification) {
    throw new AppError('Notification not found.', 404);
  }

  return notification;
};

export const getMyNotifications = async (userId, query) => {
  const pagination = parsePagination(query);
  const isRead = parseOptionalBooleanQuery(query?.isRead, 'isRead');
  const filter = {
    recipient: userId,
  };

  if (isRead !== undefined) {
    filter.isRead = isRead;
  }

  const [notifications, totalItems, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(ACTOR_POPULATE)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pagination.limit);

  return {
    notifications: notifications.map(sanitizeNotification),
    unreadCount,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  };
};

export const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await getNotificationForRecipientOrThrow(notificationId, userId);

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return {
    notification: sanitizeNotification(notification.toObject()),
  };
};

export const markAllNotificationsAsRead = async (userId) => {
  const readAt = new Date();

  const result = await Notification.updateMany(
    {
      recipient: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt,
      },
    },
  );

  return {
    modifiedCount: result.modifiedCount,
    readAt,
  };
};

export const sendManualNotificationToSingleToken = async (payload) => {
  const requestPayload = normalizePayload(payload);
  const title = normalizeTitle(requestPayload.title);
  const body = normalizeBody(requestPayload.body);
  const token = normalizeToken(requestPayload.token);
  const data = normalizeData(requestPayload.data);
  const imageUrl = normalizeOptionalImageUrl(requestPayload.imageUrl);

  return sendNotificationToToken({
    token,
    title,
    body,
    data,
    imageUrl,
  });
};

export const sendManualNotificationToSelectedUsers = async (payload) => {
  const requestPayload = normalizePayload(payload);
  const title = normalizeTitle(requestPayload.title);
  const body = normalizeBody(requestPayload.body);
  const userIds = normalizeUserIds(requestPayload.userIds);
  const data = normalizeData(requestPayload.data);
  const imageUrl = normalizeOptionalImageUrl(requestPayload.imageUrl);
  const tokens = await getUserTokens(userIds);

  return {
    targetUserCount: userIds.length,
    tokenCount: tokens.length,
    delivery: await sendNotificationToTokens({
      tokens,
      title,
      body,
      data,
      imageUrl,
    }),
  };
};

export const sendManualNotificationToAllUsers = async (payload) => {
  const requestPayload = normalizePayload(payload);
  const title = normalizeTitle(requestPayload.title);
  const body = normalizeBody(requestPayload.body);
  const data = normalizeData(requestPayload.data);
  const imageUrl = normalizeOptionalImageUrl(requestPayload.imageUrl);
  const topic = typeof requestPayload.topic === 'string' && requestPayload.topic.trim()
    ? requestPayload.topic.trim()
    : env.fcmGlobalTopic;

  return sendNotificationToTopic({
    topic,
    title,
    body,
    data,
    imageUrl,
  });
};

const safeCreateAndDispatchNotification = async ({
  recipientUserId,
  actorUserId,
  quoteId,
  commentId,
  type,
  title,
  body,
  data,
}) => {
  if (String(recipientUserId) === String(actorUserId)) {
    return null;
  }

  const recipient = await User.findById(recipientUserId).lean();

  if (!recipient || !recipient.isActive) {
    return null;
  }

  const notification = await createNotificationRecord({
    recipientUserId,
    actorUserId,
    quoteId,
    commentId,
    type,
    title,
    body,
    data,
  });

  const tokens = Array.isArray(recipient.fcmTokens)
    ? recipient.fcmTokens.map((device) => device.token)
    : [];

  let deliveryResult;

  try {
    deliveryResult = await sendNotificationToTokens({
      tokens,
      title,
      body,
      data,
    });
  } catch (error) {
    deliveryResult = buildFailureResult(error);
  }

  await updateNotificationDelivery(notification._id, deliveryResult);

  const refreshedNotification = await Notification.findById(notification._id)
    .populate(ACTOR_POPULATE)
    .lean();
  return sanitizeNotification(refreshedNotification);
};

export const notifyQuoteLiked = async ({ recipientUserId, actor, quoteId }) => {
  try {
    return await safeCreateAndDispatchNotification({
      recipientUserId,
      actorUserId: actor.id,
      quoteId,
      type: NOTIFICATION_TYPES.QUOTE_LIKED,
      title: 'New like on your quote',
      body: `${actor.name} liked your quote.`,
      data: {
        type: NOTIFICATION_TYPES.QUOTE_LIKED,
        quoteId,
        actorId: actor.id,
      },
    });
  } catch (error) {
    logger.error('Failed to notify quote like.', {
      event: 'notify_quote_liked_failed',
      error,
      recipientUserId,
      quoteId,
      actorId: actor.id,
    });
    return null;
  }
};

export const notifyQuoteCommented = async ({
  recipientUserId,
  actor,
  quoteId,
  commentId,
}) => {
  try {
    return await safeCreateAndDispatchNotification({
      recipientUserId,
      actorUserId: actor.id,
      quoteId,
      commentId,
      type: NOTIFICATION_TYPES.QUOTE_COMMENTED,
      title: 'New comment on your quote',
      body: `${actor.name} commented on your quote.`,
      data: {
        type: NOTIFICATION_TYPES.QUOTE_COMMENTED,
        quoteId,
        commentId,
        actorId: actor.id,
      },
    });
  } catch (error) {
    logger.error('Failed to notify quote comment.', {
      event: 'notify_quote_commented_failed',
      error,
      recipientUserId,
      quoteId,
      commentId,
      actorId: actor.id,
    });
    return null;
  }
};

export const notifyCommentReplied = async ({
  recipientUserId,
  actor,
  quoteId,
  commentId,
}) => {
  try {
    return await safeCreateAndDispatchNotification({
      recipientUserId,
      actorUserId: actor.id,
      quoteId,
      commentId,
      type: NOTIFICATION_TYPES.COMMENT_REPLIED,
      title: 'New reply to your comment',
      body: `${actor.name} replied to your comment.`,
      data: {
        type: NOTIFICATION_TYPES.COMMENT_REPLIED,
        quoteId,
        commentId,
        actorId: actor.id,
      },
    });
  } catch (error) {
    logger.error('Failed to notify comment reply.', {
      event: 'notify_comment_replied_failed',
      error,
      recipientUserId,
      quoteId,
      commentId,
      actorId: actor.id,
    });
    return null;
  }
};

