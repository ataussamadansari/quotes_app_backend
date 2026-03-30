import { addCommentToQuote, getCommentsByQuote } from '../services/comment.service.js';

export const addCommentHandler = async (request, response) => {
  const result = await addCommentToQuote(
    request.params.quoteId,
    request.user.id,
    request.body,
  );

  response.status(201).json({
    success: true,
    message: result.comment.parentId
      ? 'Reply added successfully.'
      : 'Comment added successfully.',
    data: result,
  });
};

export const getCommentsByQuoteHandler = async (request, response) => {
  const result = await getCommentsByQuote(request.params.quoteId, request.query);

  response.status(200).json({
    success: true,
    message: 'Comments fetched successfully.',
    data: result,
  });
};
