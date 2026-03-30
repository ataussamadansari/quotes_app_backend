import { recordQuoteShare } from '../services/share.service.js';

export const recordQuoteShareHandler = async (request, response) => {
  const result = await recordQuoteShare(
    request.params.quoteId,
    request.user.id,
    request.body,
  );

  response.status(201).json({
    success: true,
    message: 'Quote share tracked successfully.',
    data: result,
  });
};
