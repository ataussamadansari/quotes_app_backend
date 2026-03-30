import mongoose from 'mongoose';

import { USER_ROLES } from '../constants/roles.js';
import Quote from '../models/quote.model.js';
import User from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { sanitizeQuote } from '../utils/sanitize-quote.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const QUOTE_MAX_LENGTH = 500;
const AUTHOR_POPULATE = {
  path: 'author',
  select: 'name role avatarUrl bio createdAt updatedAt',
};

const normalizePayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Request body must be a JSON object.', 400);
  }

  return payload;
};

const normalizeQuoteText = (text) => {
  if (typeof text !== 'string') {
    throw new AppError('Quote text is required.', 400);
  }

  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new AppError('Quote text is required.', 400);
  }

  if (normalizedText.length > QUOTE_MAX_LENGTH) {
    throw new AppError(
      `Quote text must not exceed ${QUOTE_MAX_LENGTH} characters.`,
      400,
    );
  }

  return normalizedText;
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

const buildPaginatedQuotesResponse = async (filter, pagination) => {
  const [quotes, totalItems] = await Promise.all([
    Quote.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(AUTHOR_POPULATE)
      .lean(),
    Quote.countDocuments(filter),
  ]);

  const visibleQuotes = quotes.filter((quote) => Boolean(quote.author));
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pagination.limit);

  return {
    quotes: visibleQuotes.map(sanitizeQuote),
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

export const createQuote = async (userId, payload) => {
  const requestPayload = normalizePayload(payload);
  const author = await getActiveUserOrThrow(userId);
  const text = normalizeQuoteText(requestPayload.text);

  const quote = await Quote.create({
    author: author._id,
    text,
  });

  await quote.populate(AUTHOR_POPULATE);

  return {
    quote: sanitizeQuote(quote.toObject()),
  };
};

export const getAllQuotes = async (query) => {
  const pagination = parsePagination(query);

  return buildPaginatedQuotesResponse({ isDeleted: false }, pagination);
};

export const getQuoteFeed = async (query) => {
  const pagination = parsePagination(query);

  return buildPaginatedQuotesResponse({ isDeleted: false }, pagination);
};

export const deleteQuoteById = async (quoteId, actor) => {
  const quote = await getQuoteOrThrow(quoteId);
  const isOwner = String(quote.author) === String(actor.id);
  const isAdmin = actor.role === USER_ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError('You can only delete your own quotes.', 403);
  }

  quote.isDeleted = true;
  quote.deletedAt = new Date();
  await quote.save();

  return {
    quoteId: quote.id,
    deletedAt: quote.deletedAt,
  };
};
