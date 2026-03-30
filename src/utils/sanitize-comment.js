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

export const sanitizeComment = (comment) => ({
  id: normalizeId(comment.id ?? comment._id),
  quoteId: normalizeId(comment.quote),
  parentId: normalizeId(comment.parentComment),
  text: comment.text,
  author: comment.author ? sanitizePublicUser(comment.author) : null,
  replyCount: Array.isArray(comment.replies) ? comment.replies.length : 0,
  replies: Array.isArray(comment.replies)
    ? comment.replies.map(sanitizeComment)
    : [],
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});
