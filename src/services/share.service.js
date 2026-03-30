import mongoose from 'mongoose';

import { SHARE_CHANNELS } from '../constants/share.js';
import Quote from '../models/quote.model.js';
import Share from '../models/share.model.js';
import User from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { sanitizeQuote } from '../utils/sanitize-quote.js';
import { sanitizeShare } from '../utils/sanitize-share.js';

const AUTHOR_POPULATE = {
  path: 'author',
  select: 'name role avatarUrl bio createdAt updatedAt',
};
const allowedChannels = new Set(Object.values(SHARE_CHANNELS));

const normalizePayload = (payload) => {
  if (payload === undefined) {
    return {};
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Request body must be a JSON object.', 400);
  }

  return payload;
};

const getActiveUserOrThrow = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError('User id is invalid.', 400);
  }

  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new AppError('Authenticated user not found.', 404);
  }

  return user;
};

const getQuoteOrThrow = async (quoteId) => {
  if (!mongoose.isValidObjectId(quoteId)) {
    throw new AppError('Quote id is invalid.', 400);
  }

  const quote = await Quote.findOne({ _id: quoteId, isDeleted: false });

  if (!quote) {
    throw new AppError('Quote not found.', 404);
  }

  return quote;
};

const normalizeChannel = (channel) => {
  if (channel === undefined || channel === null || channel === '') {
    return SHARE_CHANNELS.OTHER;
  }

  if (typeof channel !== 'string') {
    throw new AppError('channel must be a string.', 400);
  }

  const normalizedChannel = channel.trim().toLowerCase();

  if (!allowedChannels.has(normalizedChannel)) {
    throw new AppError(
      'channel must be copy_link, whatsapp, telegram, facebook, twitter, instagram, or other.',
      400,
    );
  }

  return normalizedChannel;
};

const getSerializedQuote = async (quoteId) => {
  const quote = await Quote.findOne({ _id: quoteId, isDeleted: false })
    .populate(AUTHOR_POPULATE)
    .lean();

  if (!quote || !quote.author) {
    throw new AppError('Quote not found.', 404);
  }

  return sanitizeQuote(quote);
};

export const recordQuoteShare = async (quoteId, userId, payload) => {
  const requestPayload = normalizePayload(payload);
  const [user, quote] = await Promise.all([
    getActiveUserOrThrow(userId),
    getQuoteOrThrow(quoteId),
  ]);
  const channel = normalizeChannel(requestPayload.channel);

  const share = await Share.create({
    quote: quote._id,
    user: user._id,
    channel,
  });

  await Quote.updateOne({ _id: quote._id }, { $inc: { shareCount: 1 } });

  const serializedQuote = await getSerializedQuote(quote._id);

  return {
    share: sanitizeShare(share.toObject()),
    shareCount: serializedQuote.counts.shares,
    quote: serializedQuote,
  };
};
