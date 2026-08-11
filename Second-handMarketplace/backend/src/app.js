const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { FRONTEND_ORIGIN, FRONTEND_ORIGINS, NODE_ENV } = require('./config/env');
const AppError = require('./errors/AppError');
const authRoutes = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
const profileRoutes = require('./routes/profileRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const aiSupportRoutes = require('./routes/aiSupportRoutes');
const docsRoutes = require('./routes/docsRoutes');
const healthRoutes = require('./routes/healthRoutes');
const reportRoutes = require('./routes/reportRoutes');
const followRoutes = require('./routes/followRoutes');
const requestContextMiddleware = require('./middlewares/requestContextMiddleware');
const { observabilityMiddleware } = require('./middlewares/observabilityMiddleware');
const { apiRateLimiter } = require('./middlewares/rateLimitMiddleware');
const { errorResponseMiddleware } = require('./middlewares/errorResponseMiddleware');
const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');

const app = express();

const configuredFrontendOrigins = new Set(
  (FRONTEND_ORIGINS || FRONTEND_ORIGIN)
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
);
const localDevelopmentOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

function allowCorsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  const normalizedOrigin = origin.replace(/\/$/, '');
  const isConfiguredOrigin = configuredFrontendOrigins.has(normalizedOrigin);
  const isLocalDevelopmentOrigin =
    NODE_ENV !== 'production' && localDevelopmentOrigins.has(normalizedOrigin);

  if (isConfiguredOrigin || isLocalDevelopmentOrigin) {
    callback(null, true);
    return;
  }

  callback(
    new AppError('Origin is not allowed by CORS policy.', {
      statusCode: 403,
      code: 'CORS_ORIGIN_DENIED',
    }),
  );
}

if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(requestContextMiddleware);
app.use(observabilityMiddleware);
app.use(errorResponseMiddleware);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  }),
);
app.use(
  cors({
    origin: allowCorsOrigin,
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  }),
);
app.use(express.json({ limit: '10mb' }));

app.use('/api', healthRoutes);
app.use('/api', apiRateLimiter);
app.use('/api/docs', docsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ai-support', aiSupportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
