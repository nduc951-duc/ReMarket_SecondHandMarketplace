const assert = require('node:assert/strict');
const test = require('node:test');

const { createResponse } = require('./helpers/httpMocks');
const { loadWithMocks } = require('./helpers/loadWithMocks');

test('demo mode blocks privileged writes', () => {
  const middleware = loadWithMocks(require.resolve('../src/middlewares/demoModeMiddleware'), {
    [require.resolve('../src/config/env')]: {
      DEMO_READ_ONLY_ADMIN: true,
    },
  });
  const res = createResponse();

  middleware.requireDemoWriteAccess({}, res, () => assert.fail('write must remain blocked'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'DEMO_READ_ONLY');
});

test('normal mode allows privileged writes after authorization', () => {
  const middleware = loadWithMocks(require.resolve('../src/middlewares/demoModeMiddleware'), {
    [require.resolve('../src/config/env')]: {
      DEMO_READ_ONLY_ADMIN: false,
    },
  });
  let nextCalled = false;

  middleware.requireDemoWriteAccess({}, createResponse(), () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('email authentication routes use a rate limiter before controllers', () => {
  const router = require('../src/routes/authRoutes');

  for (const routePath of ['/register', '/forgot-password', '/resend-verification']) {
    const route = router.stack.find((layer) => layer.route?.path === routePath);
    assert.equal(route.route.stack[0].handle.name, 'authEmailRateLimiter');
  }
});
