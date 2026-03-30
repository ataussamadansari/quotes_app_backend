import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

likeSchema.index({ quote: 1, user: 1 }, { unique: true });
likeSchema.index({ user: 1, createdAt: -1 });
likeSchema.index({ quote: 1, createdAt: -1 });

const Like = mongoose.model('Like', likeSchema);

export default Like;
