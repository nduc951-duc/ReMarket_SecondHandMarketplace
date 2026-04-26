const express = require('express');
const cors = require('cors');
const { FRONTEND_ORIGIN } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
const profileRoutes = require('./routes/profileRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_, res) => {
  res.status(200).json({
    ok: true,
    message: 'Backend is running.',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/transactions', transactionRoutes);

module.exports = app;
