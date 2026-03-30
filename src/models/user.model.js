import mongoose from 'mongoose';

import { DEVICE_PLATFORMS } from '../constants/fcm.js';
import { USER_ROLES } from '../constants/roles.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fcmTokenSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    token: {
      type: String,
      required: true,
      trim: true,
      maxlength: 512,
    },
    platform: {
      type: String,
      enum: Object.values(DEVICE_PLATFORMS),
      default: DEVICE_PLATFORMS.UNKNOWN,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: emailPattern,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    googleId: {
      type: String,
      default: undefined,
    },
    avatarUrl: {
      type: String,
      default: null,
      trim: true,
    },
    bio: {
      type: String,
      default: null,
      trim: true,
      maxlength: 280,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    authProviders: {
      local: {
        type: Boolean,
        default: false,
      },
      google: {
        type: Boolean,
        default: false,
      },
    },
    fcmTokens: {
      type: [fcmTokenSchema],
      default: [],
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', userSchema);

export default User;
