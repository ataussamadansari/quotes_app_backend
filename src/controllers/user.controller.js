import {
  getOwnProfile,
  getPublicUserDetails,
  saveUserFcmToken,
  updateOwnProfile,
} from '../services/user.service.js';

export const getMyProfile = async (request, response) => {
  const result = await getOwnProfile(request.user.id);

  response.status(200).json({
    success: true,
    message: 'Profile fetched successfully.',
    data: result,
  });
};

export const updateMyProfile = async (request, response) => {
  const result = await updateOwnProfile(request.user.id, request.body);

  response.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: result,
  });
};

export const upsertMyFcmToken = async (request, response) => {
  const result = await saveUserFcmToken(request.user.id, request.body);

  response.status(200).json({
    success: true,
    message: 'FCM token saved successfully.',
    data: result,
  });
};

export const getUserDetails = async (request, response) => {
  const result = await getPublicUserDetails(request.params.userId);

  response.status(200).json({
    success: true,
    message: 'User details fetched successfully.',
    data: result,
  });
};
