export const notFoundHandler = (request, _response, next) => {
  const error = new Error(`Route ${request.originalUrl} does not exist.`);
  error.statusCode = 404;
  next(error);
};
