import { Router } from 'express';

import authRouter from './auth.routes.js';
import healthRouter from './health.routes.js';
import notificationRouter from './notification.routes.js';
import quoteRouter from './quote.routes.js';
import userRouter from './user.routes.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/health', healthRouter);
router.use('/notifications', notificationRouter);
router.use('/quotes', quoteRouter);
router.use('/users', userRouter);

export default router;
