import { OAuth2Client } from 'google-auth-library';

import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

const googleClient = new OAuth2Client();

export const verifyGoogleIdToken = async (idToken) => {
  if (env.googleClientIds.length === 0) {
    throw new AppError('Google OAuth is not configured on the server.', 503);
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientIds,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload?.email) {
    throw new AppError('Invalid Google account payload.', 401);
  }

  if (!payload.email_verified) {
    throw new AppError('Google account email must be verified.', 401);
  }

  return {
    googleId: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: payload.name?.trim() || payload.email.split('@')[0],
    avatarUrl: payload.picture ?? null,
  };
};
