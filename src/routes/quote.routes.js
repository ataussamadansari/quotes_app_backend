import { Router } from 'express';

import {
  addCommentHandler,
  getCommentsByQuoteHandler,
} from '../controllers/comment.controller.js';
import { toggleQuoteLikeHandler } from '../controllers/like.controller.js';
import {
  createQuoteHandler,
  deleteQuoteHandler,
  getAllQuotesHandler,
  getQuoteFeedHandler,
} from '../controllers/quote.controller.js';
import { recordQuoteShareHandler } from '../controllers/share.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  addCommentSchema,
  createQuoteSchema,
  quoteCommentsQuerySchema,
  quoteIdParamsSchema,
  quoteListQuerySchema,
  shareQuoteSchema,
} from '../validations/quote.validation.js';

const quoteRouter = Router();

quoteRouter.get('/', validate({ query: quoteListQuerySchema }), getAllQuotesHandler);
quoteRouter.get('/feed', validate({ query: quoteListQuerySchema }), getQuoteFeedHandler);
quoteRouter.get(
  '/:quoteId/comments',
  validate({ params: quoteIdParamsSchema, query: quoteCommentsQuerySchema }),
  getCommentsByQuoteHandler,
);
quoteRouter.post('/', authenticate, validate({ body: createQuoteSchema }), createQuoteHandler);
quoteRouter.post(
  '/:quoteId/comments',
  authenticate,
  validate({ params: quoteIdParamsSchema, body: addCommentSchema }),
  addCommentHandler,
);
quoteRouter.post(
  '/:quoteId/like',
  authenticate,
  validate({ params: quoteIdParamsSchema }),
  toggleQuoteLikeHandler,
);
quoteRouter.post(
  '/:quoteId/share',
  authenticate,
  validate({ params: quoteIdParamsSchema, body: shareQuoteSchema }),
  recordQuoteShareHandler,
);
quoteRouter.delete(
  '/:quoteId',
  authenticate,
  validate({ params: quoteIdParamsSchema }),
  deleteQuoteHandler,
);

export default quoteRouter;
