import { USER_ROLES } from '../constants/roles.js';
import User from '../models/user.model.js';
import { verifyGoogleIdToken } from './google-auth.service.js';
import { AppError } from '../utils/app-error.js';
import { createAccessToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { sanitizeUser } from '../utils/sanitize-user.js';
import { env } from '../config/env.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const normalizeEmail = (email) => {
  if (typeof email !== 'string') {
    throw new AppError('Email is required.', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!emailPattern.test(normalizedEmail)) {
    throw new AppError('A valid email address is required.', 400);
  }

  return normalizedEmail;
};

const normalizeName = (name) => {
  if (typeof name !== 'string' || name.trim().length < 2) {
    throw new AppError('Name must be at least 2 characters long.', 400);
  }

  return name.trim();
};

const validateRegistrationPassword = (password) => {
  if (typeof password !== 'string' || !passwordPattern.test(password)) {
    throw new AppError(
      'Password must be at least 8 characters long and include letters and numbers.',
      400,
    );
  }

  return password;
};

const normalizeLoginPassword = (password) => {
  if (typeof password !== 'string' || !password.trim()) {
    throw new AppError('Password is required.', 400);
  }

  return password;
};

const buildAuthResult = async (user) => ({
  user: sanitizeUser(user),
  accessToken: await createAccessToken(user),
  tokenType: 'Bearer',
  expiresIn: env.jwtExpiresIn,
});

export const registerUser = async ({ name, email, password }) => {
  const normalizedName = normalizeName(name);
  const normalizedEmail = normalizeEmail(email);
  const validatedPassword = validateRegistrationPassword(password);

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    passwordHash: await hashPassword(validatedPassword),
    role: USER_ROLES.USER,
    authProviders: {
      local: true,
      google: false,
    },
    lastLoginAt: new Date(),
  });

  return buildAuthResult(user);
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizeLoginPassword(password);

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.passwordHash || !user.authProviders?.local) {
    throw new AppError('This account uses Google sign-in. Continue with Google.', 401);
  }

  const passwordMatches = await comparePassword(
    normalizedPassword,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('This account has been deactivated.', 403);
  }

  user.lastLoginAt = new Date();
  await user.save();

  return buildAuthResult(user);
};

export const loginWithGoogle = async ({ idToken }) => {
  if (typeof idToken !== 'string' || !idToken.trim()) {
    throw new AppError('Google idToken is required.', 400);
  }

  const googleProfile = await verifyGoogleIdToken(idToken.trim());

  let user = await User.findOne({
    $or: [{ googleId: googleProfile.googleId }, { email: googleProfile.email }],
  }).select('+passwordHash');

  if (!user) {
    user = await User.create({
      name: googleProfile.name,
      email: googleProfile.email,
      googleId: googleProfile.googleId,
      avatarUrl: googleProfile.avatarUrl,
      role: USER_ROLES.USER,
      authProviders: {
        local: false,
        google: true,
      },
      lastLoginAt: new Date(),
    });

    return buildAuthResult(user);
  }

  if (!user.isActive) {
    throw new AppError('This account has been deactivated.', 403);
  }

  user.googleId = user.googleId || googleProfile.googleId;
  user.avatarUrl = user.avatarUrl || googleProfile.avatarUrl;
  user.authProviders = {
    ...user.authProviders,
    google: true,
    local: Boolean(user.authProviders?.local),
  };
  user.lastLoginAt = new Date();

  await user.save();

  return buildAuthResult(user);
};

export const getCurrentUserProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('Authenticated user not found.', 404);
  }

  return {
    user: sanitizeUser(user),
  };
};
