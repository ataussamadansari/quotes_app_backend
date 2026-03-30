import { Router } from 'express';

import {
  getCurrentUser,
  googleLogin,
  login,
  register,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  googleLoginSchema,
  loginSchema,
  registerSchema,
} from '../validations/auth.validation.js';

const authRouter = Router();

authRouter.post('/register', authRateLimiter, validate({ body: registerSchema }), register);
authRouter.post('/login', authRateLimiter, validate({ body: loginSchema }), login);
authRouter.post('/google', authRateLimiter, validate({ body: googleLoginSchema }), googleLogin);
authRouter.get('/me', authenticate, getCurrentUser);

export default authRouter;
