import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { attachRequestContext } from './middleware/request-context.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { apiRateLimiter } from './middleware/rate-limit.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import apiRouter from './routes/index.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.trustProxy);

app.use(attachRequestContext);
app.use(requestLogger);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.corsOrigins.includes('*') ? '*' : env.corsOrigins,
    credentials: !env.corsOrigins.includes('*'),
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/', (_request, response) => {
  response.status(200).json({
    success: true,
    message: 'Quotes Social App backend is running.',
  });
});

app.use(env.apiPrefix, apiRateLimiter, apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
