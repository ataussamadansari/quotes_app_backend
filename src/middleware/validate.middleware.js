export const validate = (schemas) => async (request, _response, next) => {
  try {
    if (schemas.params) {
      request.params = await schemas.params.parseAsync(request.params);
    }

    if (schemas.query) {
      request.query = await schemas.query.parseAsync(request.query);
    }

    if (schemas.body) {
      request.body = await schemas.body.parseAsync(request.body);
    }

    next();
  } catch (error) {
    next(error);
  }
};
