import { Router } from 'express';

import {
  getMyProfile,
  getUserDetails,
  updateMyProfile,
  upsertMyFcmToken,
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  saveFcmTokenSchema,
  updateProfileSchema,
  userIdParamsSchema,
} from '../validations/user.validation.js';

const userRouter = Router();

userRouter.use(authenticate);
userRouter.get('/me', getMyProfile);
userRouter.patch('/me', validate({ body: updateProfileSchema }), updateMyProfile);
userRouter.put('/me/fcm-token', validate({ body: saveFcmTokenSchema }), upsertMyFcmToken);
userRouter.get('/:userId', validate({ params: userIdParamsSchema }), getUserDetails);

export default userRouter;
