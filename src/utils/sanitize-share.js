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

export const sanitizeShare = (share) => ({
  id: normalizeId(share.id ?? share._id),
  quoteId: normalizeId(share.quote),
  userId: normalizeId(share.user),
  channel: share.channel,
  createdAt: share.createdAt,
  updatedAt: share.updatedAt,
});
