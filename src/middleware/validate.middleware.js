export const validate = (schemas) => async (request, _response, next) => {
  try {
    if (schemas.params) {
      const parsed = await schemas.params.parseAsync(request.params);
      Object.assign(request.params, parsed);
    }

    if (schemas.query) {
      // Node.js 25+ makes req.query a read-only getter — use Object.defineProperty
      const parsed = await schemas.query.parseAsync(request.query);
      Object.defineProperty(request, 'query', {
        value: parsed,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    if (schemas.body) {
      request.body = await schemas.body.parseAsync(request.body);
    }

    next();
  } catch (error) {
    next(error);
  }
};
