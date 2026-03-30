import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendManualNotificationToAllUsers,
  sendManualNotificationToSelectedUsers,
  sendManualNotificationToSingleToken,
} from '../services/notification.service.js';

export const getMyNotificationsHandler = async (request, response) => {
  const result = await getMyNotifications(request.user.id, request.query);

  response.status(200).json({
    success: true,
    message: 'Notifications fetched successfully.',
    data: result,
  });
};

export const markNotificationAsReadHandler = async (request, response) => {
  const result = await markNotificationAsRead(
    request.params.notificationId,
    request.user.id,
  );

  response.status(200).json({
    success: true,
    message: 'Notification marked as read successfully.',
    data: result,
  });
};

export const markAllNotificationsAsReadHandler = async (request, response) => {
  const result = await markAllNotificationsAsRead(request.user.id);

  response.status(200).json({
    success: true,
    message: 'All notifications marked as read successfully.',
    data: result,
  });
};

export const sendNotificationToSingleTokenHandler = async (request, response) => {
  const result = await sendManualNotificationToSingleToken(request.body);

  response.status(200).json({
    success: true,
    message: 'Notification sent to the token successfully.',
    data: result,
  });
};

export const sendNotificationToSelectedUsersHandler = async (
  request,
  response,
) => {
  const result = await sendManualNotificationToSelectedUsers(request.body);

  response.status(200).json({
    success: true,
    message: 'Notification sent to selected users successfully.',
    data: result,
  });
};

export const sendNotificationToAllUsersHandler = async (request, response) => {
  const result = await sendManualNotificationToAllUsers(request.body);

  response.status(200).json({
    success: true,
    message: 'Notification sent to the topic successfully.',
    data: result,
  });
};
