import {
  createQuote,
  deleteQuoteById,
  getAllQuotes,
  getQuoteFeed,
} from '../services/quote.service.js';

export const createQuoteHandler = async (request, response) => {
  const result = await createQuote(request.user.id, request.body);

  response.status(201).json({
    success: true,
    message: 'Quote created successfully.',
    data: result,
  });
};

export const getAllQuotesHandler = async (request, response) => {
  const result = await getAllQuotes(request.query);

  response.status(200).json({
    success: true,
    message: 'Quotes fetched successfully.',
    data: result,
  });
};

export const getQuoteFeedHandler = async (request, response) => {
  const result = await getQuoteFeed(request.query);

  response.status(200).json({
    success: true,
    message: 'Quote feed fetched successfully.',
    data: result,
  });
};

export const deleteQuoteHandler = async (request, response) => {
  const result = await deleteQuoteById(request.params.quoteId, request.user);

  response.status(200).json({
    success: true,
    message: 'Quote deleted successfully.',
    data: result,
  });
};
