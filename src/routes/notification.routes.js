import { Router } from 'express';

import {
  getMyNotificationsHandler,
  markAllNotificationsAsReadHandler,
  markNotificationAsReadHandler,
  sendNotificationToAllUsersHandler,
  sendNotificationToSelectedUsersHandler,
  sendNotificationToSingleTokenHandler,
} from '../controllers/notification.controller.js';
import { USER_ROLES } from '../constants/roles.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { adminNotificationRateLimiter } from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  notificationIdParamsSchema,
  notificationListQuerySchema,
  sendToSelectedUsersSchema,
  sendToSingleTokenSchema,
  sendToTopicSchema,
} from '../validations/notification.validation.js';

const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.get('/', validate({ query: notificationListQuerySchema }), getMyNotificationsHandler);
notificationRouter.patch('/read-all', markAllNotificationsAsReadHandler);
notificationRouter.patch(
  '/:notificationId/read',
  validate({ params: notificationIdParamsSchema }),
  markNotificationAsReadHandler,
);
notificationRouter.post(
  '/send/token',
  authorizeRoles(USER_ROLES.ADMIN),
  adminNotificationRateLimiter,
  validate({ body: sendToSingleTokenSchema }),
  sendNotificationToSingleTokenHandler,
);
notificationRouter.post(
  '/send/users',
  authorizeRoles(USER_ROLES.ADMIN),
  adminNotificationRateLimiter,
  validate({ body: sendToSelectedUsersSchema }),
  sendNotificationToSelectedUsersHandler,
);
notificationRouter.post(
  '/send/topic',
  authorizeRoles(USER_ROLES.ADMIN),
  adminNotificationRateLimiter,
  validate({ body: sendToTopicSchema }),
  sendNotificationToAllUsersHandler,
);

export default notificationRouter;
