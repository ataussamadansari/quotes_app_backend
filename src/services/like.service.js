import mongoose from 'mongoose';

import Like from '../models/like.model.js';
import Quote from '../models/quote.model.js';
import User from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { sanitizeQuote } from '../utils/sanitize-quote.js';
import { notifyQuoteLiked } from './notification.service.js';

const AUTHOR_POPULATE = {
  path: 'author',
  select: 'name role avatarUrl bio createdAt updatedAt',
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

const getSerializedQuote = async (quoteId) => {
  const quote = await Quote.findOne({ _id: quoteId, isDeleted: false })
    .populate(AUTHOR_POPULATE)
    .lean();

  if (!quote || !quote.author) {
    throw new AppError('Quote not found.', 404);
  }

  return sanitizeQuote(quote);
};

const decrementLikeCountSafely = async (quoteId) => {
  await Quote.updateOne(
    { _id: quoteId },
    [
      {
        $set: {
          likeCount: {
            $cond: [
              { $gt: ['$likeCount', 0] },
              { $subtract: ['$likeCount', 1] },
              0,
            ],
          },
        },
      },
    ],
  );
};

export const toggleQuoteLike = async (quoteId, userId) => {
  const [user, quote] = await Promise.all([
    getActiveUserOrThrow(userId),
    getQuoteOrThrow(quoteId),
  ]);

  const removedLike = await Like.findOneAndDelete({
    quote: quote._id,
    user: user._id,
  });

  let liked = false;

  if (removedLike) {
    await decrementLikeCountSafely(quote._id);
  } else {
    try {
      await Like.create({
        quote: quote._id,
        user: user._id,
      });

      await Quote.updateOne({ _id: quote._id }, { $inc: { likeCount: 1 } });
      liked = true;
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }

      liked = true;
    }
  }

  if (liked) {
    await notifyQuoteLiked({
      recipientUserId: quote.author,
      actor: user,
      quoteId: quote._id,
    });
  }

  const serializedQuote = await getSerializedQuote(quote._id);

  return {
    liked,
    likeCount: serializedQuote.counts.likes,
    quote: serializedQuote,
  };
};
