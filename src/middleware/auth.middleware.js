import { jwtVerify } from 'jose';

import { env } from '../config/env.js';
import User from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { setRequestContextValues } from '../utils/request-context.js';

const jwtSecret = new TextEncoder().encode(env.jwtSecret);

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    throw new AppError('Authorization header is required.', 401);
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Authorization header must use the Bearer scheme.', 401);
  }

  return token;
};

export const authenticate = async (request, _response, next) => {
  try {
    const token = extractBearerToken(request.headers.authorization);

    let payload;

    try {
      ({ payload } = await jwtVerify(token, jwtSecret, {
        issuer: env.jwtIssuer,
        audience: env.jwtAudience,
      }));
    } catch {
      next(new AppError('Invalid or expired access token.', 401));
      return;
    }

    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      next(new AppError('Authenticated user is no longer active.', 401));
      return;
    }

    request.user = user;
    request.auth = payload;
    setRequestContextValues({
      userId: String(user.id),
      userRole: user.role,
    });

    next();
  } catch (error) {
    next(error);
  }
};

export const authorizeRoles = (...allowedRoles) => (request, _response, next) => {
  if (!request.user) {
    next(new AppError('Authentication is required before authorization.', 401));
    return;
  }

  if (!allowedRoles.includes(request.user.role)) {
    next(new AppError('You do not have permission to access this resource.', 403));
    return;
  }

  next();
};
