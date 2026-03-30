import { env } from '../config/env.js';
import { USER_ROLES } from '../constants/roles.js';
import User from '../models/user.model.js';
import { logger } from '../utils/logger.js';
import { hashPassword } from '../utils/password.js';

const normalizeSeedEmail = (email) => email?.trim().toLowerCase();

export const ensureAdminAccount = async () => {
  const hasAnyAdminSeedValue = [
    env.adminSeedName,
    env.adminSeedEmail,
    env.adminSeedPassword,
  ].some(Boolean);

  if (!hasAnyAdminSeedValue) {
    return;
  }

  const hasCompleteAdminSeed = [
    env.adminSeedName,
    env.adminSeedEmail,
    env.adminSeedPassword,
  ].every(Boolean);

  if (!hasCompleteAdminSeed) {
    throw new Error(
      'ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be provided together.',
    );
  }

  const adminEmail = normalizeSeedEmail(env.adminSeedEmail);
  let adminUser = await User.findOne({ email: adminEmail }).select('+passwordHash');

  if (!adminUser) {
    await User.create({
      name: env.adminSeedName,
      email: adminEmail,
      passwordHash: await hashPassword(env.adminSeedPassword),
      role: USER_ROLES.ADMIN,
      authProviders: {
        local: true,
        google: false,
      },
      googleId: undefined, // sparse index — null causes duplicate key with multiple non-google users
    });

    logger.info('Admin account seeded.', {
      event: 'admin_seeded',
      adminEmail,
    });
    return;
  }

  let shouldSave = false;

  if (adminUser.role !== USER_ROLES.ADMIN) {
    adminUser.role = USER_ROLES.ADMIN;
    shouldSave = true;
  }

  if (!adminUser.authProviders?.local || !adminUser.passwordHash) {
    adminUser.passwordHash = await hashPassword(env.adminSeedPassword);
    adminUser.authProviders = {
      ...adminUser.authProviders,
      local: true,
      google: Boolean(adminUser.authProviders?.google),
    };
    shouldSave = true;
  }

  if (shouldSave) {
    await adminUser.save();
    logger.info('Admin account ensured.', {
      event: 'admin_ensured',
      adminEmail,
    });
  }
};
