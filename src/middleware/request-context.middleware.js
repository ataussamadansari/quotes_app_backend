import { randomUUID } from 'node:crypto';

import { runWithRequestContext } from '../utils/request-context.js';

const normalizeRequestId = (headerValue) => {
  if (Array.isArray(headerValue)) {
    return headerValue[0]?.trim();
  }

  if (typeof headerValue === 'string') {
    return headerValue.trim();
  }

  return undefined;
};

export const attachRequestContext = (request, response, next) => {
  const requestId = normalizeRequestId(request.headers['x-request-id']) || randomUUID();

  response.setHeader('X-Request-Id', requestId);

  runWithRequestContext({ requestId }, () => {
    next();
  });
};
