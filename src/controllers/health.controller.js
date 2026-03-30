import { getHealthStatus, getReadinessStatus } from '../services/health.service.js';

export const getHealth = (_request, response) => {
  response.status(200).json({
    success: true,
    message: 'Service health fetched successfully.',
    data: getHealthStatus(),
  });
};

export const getReadiness = (_request, response) => {
  const readiness = getReadinessStatus();

  response.status(readiness.status === 'ready' ? 200 : 503).json({
    success: readiness.status === 'ready',
    message:
      readiness.status === 'ready'
        ? 'Service readiness fetched successfully.'
        : 'Service is not ready to receive traffic.',
    data: readiness,
  });
};
