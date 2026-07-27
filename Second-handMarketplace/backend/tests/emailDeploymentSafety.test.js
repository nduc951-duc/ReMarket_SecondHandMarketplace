const assert = require('node:assert/strict');
const test = require('node:test');

const { loadWithMocks } = require('./helpers/loadWithMocks');

test('production email endpoint is closed when MAIL_API_KEY is missing', () => {
  const controller = loadWithMocks(require.resolve('../src/controllers/emailController'), {
    [require.resolve('../src/config/env')]: {
      MAIL_API_KEY: '',
      NODE_ENV: 'production',
    },
    [require.resolve('../src/services/gmailService')]: {
      sendMail: async () => ({}),
    },
  });

  assert.equal(controller.isAuthorized({ headers: {} }), false);
});

test('SMTP transport is preferred over the Gmail fallback', () => {
  const service = loadWithMocks(require.resolve('../src/services/gmailService'), {
    [require.resolve('../src/config/env')]: {
      GMAIL_APP_PASSWORD: '',
      GMAIL_USER: '',
      MAIL_FROM_EMAIL: 'no-reply@demo.example',
      MAIL_FROM_NAME: 'ReMarket',
      SMTP_HOST: 'smtp.demo.example',
      SMTP_PASSWORD: 'secret',
      SMTP_PORT: 587,
      SMTP_SECURE: false,
      SMTP_USER: 'demo-user',
    },
    [require.resolve('nodemailer')]: {
      createTransport: () => ({ sendMail: async () => ({}) }),
    },
  });

  assert.deepEqual(service.buildTransportOptions(), {
    host: 'smtp.demo.example',
    port: 587,
    secure: false,
    auth: {
      user: 'demo-user',
      pass: 'secret',
    },
  });
  assert.equal(service.getSenderAddress(), 'no-reply@demo.example');
});
