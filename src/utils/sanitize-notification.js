import { sanitizePublicUser } from './sanitize-user.js';

const normalizeId = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && '_id' in value && value._id) {
    return String(value._id);
  }

  return String(value);
};

const normalizeActor = (actor) => {
  if (!actor || typeof actor !== 'object' || !('name' in actor)) {
    return null;
  }

  return sanitizePublicUser(actor);
};

export const sanitizeNotification = (notification) => ({
  id: normalizeId(notification.id ?? notification._id),
  recipientId: normalizeId(notification.recipient),
  actorId: normalizeId(notification.actor),
  actor: normalizeActor(notification.actor),
  quoteId: normalizeId(notification.quote),
  commentId: normalizeId(notification.comment),
  type: notification.type,
  title: notification.title,
  body: notification.body,
  data: notification.data instanceof Map
    ? Object.fromEntries(notification.data)
    : notification.data,
  isRead: notification.isRead,
  readAt: notification.readAt,
  pushStatus: notification.pushStatus,
  pushAttemptedAt: notification.pushAttemptedAt,
  pushSentAt: notification.pushSentAt,
  pushFailureReason: notification.pushFailureReason,
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
});
