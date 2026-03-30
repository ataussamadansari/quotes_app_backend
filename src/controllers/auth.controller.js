import {
  getCurrentUserProfile,
  loginUser,
  loginWithGoogle,
  registerUser,
} from '../services/auth.service.js';

export const register = async (request, response) => {
  const result = await registerUser(request.body);

  response.status(201).json({
    success: true,
    message: 'User registered successfully.',
    data: result,
  });
};

export const login = async (request, response) => {
  const result = await loginUser(request.body);

  response.status(200).json({
    success: true,
    message: 'User logged in successfully.',
    data: result,
  });
};

export const googleLogin = async (request, response) => {
  const result = await loginWithGoogle(request.body);

  response.status(200).json({
    success: true,
    message: 'Google sign-in completed successfully.',
    data: result,
  });
};

export const getCurrentUser = async (request, response) => {
  const result = await getCurrentUserProfile(request.user.id);

  response.status(200).json({
    success: true,
    message: 'Authenticated user fetched successfully.',
    data: result,
  });
};
