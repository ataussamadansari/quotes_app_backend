const normalizeEntityId = (entity) => {
  if (!entity) {
    return null;
  }

  if (entity.id) {
    return String(entity.id);
  }

  if (entity._id) {
    return String(entity._id);
  }

  return null;
};

const sanitizeFcmDevice = (device) => ({
  deviceId: device.deviceId,
  platform: device.platform,
  lastUsedAt: device.lastUsedAt,
  createdAt: device.createdAt,
  updatedAt: device.updatedAt,
});

export { sanitizeFcmDevice };

export const sanitizeUser = (user) => {
  const fcmDevices = Array.isArray(user.fcmTokens)
    ? user.fcmTokens.map(sanitizeFcmDevice)
    : [];

  return {
    id: normalizeEntityId(user),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isActive: user.isActive,
    authProviders: {
      local: Boolean(user.authProviders?.local),
      google: Boolean(user.authProviders?.google),
    },
    fcmDeviceCount: fcmDevices.length,
    fcmDevices,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const sanitizePublicUser = (user) => ({
  id: normalizeEntityId(user),
  name: user.name,
  role: user.role,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
