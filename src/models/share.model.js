import mongoose from 'mongoose';

import { SHARE_CHANNELS } from '../constants/share.js';

const shareSchema = new mongoose.Schema(
  {
    quote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channel: {
      type: String,
      enum: Object.values(SHARE_CHANNELS),
      default: SHARE_CHANNELS.OTHER,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

shareSchema.index({ quote: 1, createdAt: -1 });
shareSchema.index({ user: 1, createdAt: -1 });
shareSchema.index({ quote: 1, user: 1, createdAt: -1 });

const Share = mongoose.model('Share', shareSchema);

export default Share;
