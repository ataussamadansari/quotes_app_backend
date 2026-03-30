import mongoose from 'mongoose';

import Comment from '../models/comment.model.js';
import Quote from '../models/quote.model.js';
import User from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { sanitizeComment } from '../utils/sanitize-comment.js';
import {
  notifyCommentReplied,
  notifyQuoteCommented,
} from './notification.service.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const COMMENT_MAX_LENGTH = 500;
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

const normalizeCommentText = (text) => {
  if (typeof text !== 'string') {
    throw new AppError('Comment text is required.', 400);
  }

  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new AppError('Comment text is required.', 400);
  }

  if (normalizedText.length > COMMENT_MAX_LENGTH) {
    throw new AppError(
      `Comment text must not exceed ${COMMENT_MAX_LENGTH} characters.`,
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

const resolveParentComment = async (parentId, quoteId) => {
  if (parentId === undefined || parentId === null || parentId === '') {
    return null;
  }

  if (typeof parentId !== 'string' || !parentId.trim()) {
    throw new AppError('parentId must be a valid comment id.', 400);
  }

  const normalizedParentId = parentId.trim();

  if (!mongoose.isValidObjectId(normalizedParentId)) {
    throw new AppError('parentId must be a valid comment id.', 400);
  }

  const parentComment = await Comment.findOne({
    _id: normalizedParentId,
    quote: quoteId,
  });

  if (!parentComment) {
    throw new AppError('Parent comment not found for this quote.', 404);
  }

  return parentComment;
};

const attachRepliesRecursively = async (quoteId, rootComments) => {
  if (rootComments.length === 0) {
    return rootComments;
  }

  const commentMap = new Map();

  for (const rootComment of rootComments) {
    rootComment.replies = [];
    commentMap.set(String(rootComment._id), rootComment);
  }

  let parentIds = rootComments.map((comment) => comment._id);

  while (parentIds.length > 0) {
    const childComments = await Comment.find({
      quote: quoteId,
      parentComment: { $in: parentIds },
    })
      .sort({ createdAt: 1 })
      .populate(AUTHOR_POPULATE)
      .lean();

    if (childComments.length === 0) {
      break;
    }

    const nextParentIds = [];

    for (const childComment of childComments) {
      childComment.replies = [];
      commentMap.set(String(childComment._id), childComment);

      const parentComment = commentMap.get(String(childComment.parentComment));

      if (parentComment) {
        parentComment.replies.push(childComment);
      }

      nextParentIds.push(childComment._id);
    }

    parentIds = nextParentIds;
  }

  return rootComments;
};

const getSerializedComment = async (commentId) => {
  const comment = await Comment.findById(commentId)
    .populate(AUTHOR_POPULATE)
    .lean();

  if (!comment || !comment.author) {
    throw new AppError('Comment not found.', 404);
  }

  comment.replies = [];

  return sanitizeComment(comment);
};

export const addCommentToQuote = async (quoteId, userId, payload) => {
  const requestPayload = normalizePayload(payload);
  const [user, quote] = await Promise.all([
    getActiveUserOrThrow(userId),
    getQuoteOrThrow(quoteId),
  ]);
  const text = normalizeCommentText(requestPayload.text);
  const parentComment = await resolveParentComment(requestPayload.parentId, quote._id);

  const comment = await Comment.create({
    quote: quote._id,
    author: user._id,
    parentComment: parentComment?._id ?? null,
    text,
  });

  await Quote.updateOne({ _id: quote._id }, { $inc: { commentCount: 1 } });

  await notifyQuoteCommented({
    recipientUserId: quote.author,
    actor: user,
    quoteId: quote._id,
    commentId: comment._id,
  });

  if (
    parentComment &&
    String(parentComment.author) !== String(user._id) &&
    String(parentComment.author) !== String(quote.author)
  ) {
    await notifyCommentReplied({
      recipientUserId: parentComment.author,
      actor: user,
      quoteId: quote._id,
      commentId: comment._id,
    });
  }

  return {
    comment: await getSerializedComment(comment._id),
    commentCount: quote.commentCount + 1,
  };
};

export const getCommentsByQuote = async (quoteId, query) => {
  const quote = await getQuoteOrThrow(quoteId);
  const pagination = parsePagination(query);
  const rootFilter = {
    quote: quote._id,
    parentComment: null,
  };

  const [rootComments, totalRootComments] = await Promise.all([
    Comment.find(rootFilter)
      .sort({ createdAt: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate(AUTHOR_POPULATE)
      .lean(),
    Comment.countDocuments(rootFilter),
  ]);

  const nestedComments = await attachRepliesRecursively(quote._id, rootComments);
  const totalPages =
    totalRootComments === 0 ? 0 : Math.ceil(totalRootComments / pagination.limit);

  return {
    quoteId: quote.id,
    commentCount: quote.commentCount,
    comments: nestedComments.map(sanitizeComment),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems: totalRootComments,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  };
};
