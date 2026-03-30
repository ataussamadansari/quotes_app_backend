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

export const sanitizeQuote = (quote) => ({
  id: normalizeId(quote.id ?? quote._id),
  text: quote.text,
  author: quote.author ? sanitizePublicUser(quote.author) : null,
  counts: {
    likes: quote.likeCount ?? 0,
    comments: quote.commentCount ?? 0,
    shares: quote.shareCount ?? 0,
  },
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
});
