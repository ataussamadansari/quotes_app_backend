import { toggleQuoteLike } from '../services/like.service.js';

export const toggleQuoteLikeHandler = async (request, response) => {
  const result = await toggleQuoteLike(request.params.quoteId, request.user.id);

  response.status(200).json({
    success: true,
    message: result.liked
      ? 'Quote liked successfully.'
      : 'Quote unliked successfully.',
    data: result,
  });
};
