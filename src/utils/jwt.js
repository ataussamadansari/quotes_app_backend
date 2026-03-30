import { SignJWT } from 'jose';

import { env } from '../config/env.js';

const jwtSecret = new TextEncoder().encode(env.jwtSecret);

export const createAccessToken = async (user) =>
  new SignJWT({
    role: user.role,
    email: user.email,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer(env.jwtIssuer)
    .setAudience(env.jwtAudience)
    .setIssuedAt()
    .setExpirationTime(env.jwtExpiresIn)
    .sign(jwtSecret);
