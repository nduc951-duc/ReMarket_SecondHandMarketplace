const assert = require('node:assert/strict');
const test = require('node:test');

const app = require('../src/app');
const { redact } = require('../src/services/logger');
const { createObservabilityMiddleware } = require('../src/middlewares/observabilityMiddleware');
const { createResponse } = require('./helpers/httpMocks');
const { loadWithMocks } = require('./helpers/loadWithMocks');

async function withServer(run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('health endpoint includes security and response-time headers', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'alive');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('x-response-time'), /^\d+\.\d{2}ms$/);
  });
});

test('development CORS accepts both localhost frontend addresses', async () => {
  await withServer(async (baseUrl) => {
    for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
      const response = await fetch(`${baseUrl}/api/health`, { headers: { origin } });

      assert.equal(response.status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
    }
  });
});

test('development CORS rejects an unrelated origin with a clear error', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { origin: 'https://untrusted.example' },
    });

    const body = await response.json();
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(body.error.code, 'CORS_ORIGIN_DENIED');
  });
});

test('CORS handles an allowed preflight before authentication middleware', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.match(response.headers.get('access-control-allow-headers'), /authorization/i);
  });
});

test('readiness returns not-ready when a required dependency fails', async () => {
  const controller = loadWithMocks(require.resolve('../src/controllers/healthController'), {
    [require.resolve('../src/services/readinessService')]: {
      checkReadiness: async () => ({
        ready: false,
        checks: { supabase: { ready: false, error: 'database_unavailable' } },
      }),
    },
  });
  const response = createResponse();

  await controller.readinessHandler({}, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.status, 'not_ready');
  assert.equal(response.body.checks.supabase.ready, false);
});

test('structured logger recursively redacts credentials and signatures', () => {
  assert.deepEqual(
    redact({
      requestId: 'req_test',
      authorization: 'Bearer secret',
      accessToken: 'jwt',
      nested: {
        password: 'secret',
        paymentSignature: 'payment-secret',
        serviceRoleKey: 'service-secret',
        email: 'hidden@example.com',
      },
    }),
    {
      requestId: 'req_test',
      authorization: '[REDACTED]',
      accessToken: '[REDACTED]',
      nested: {
        password: '[REDACTED]',
        paymentSignature: '[REDACTED]',
        serviceRoleKey: '[REDACTED]',
        email: 'hidden@example.com',
      },
    },
  );
});

test('access logger records only route metadata and duration', () => {
  const entries = [];
  const middleware = createObservabilityMiddleware({
    now: (() => {
      const values = [0n, 2_500_000n, 3_000_000n];
      return () => values.shift();
    })(),
    log: { info: (event, fields) => entries.push({ event, fields }) },
  });
  const listeners = {};
  const req = { requestId: 'req_test', method: 'GET', originalUrl: '/api/items?token=secret' };
  const res = {
    headersSent: false,
    statusCode: 200,
    once: (event, handler) => {
      listeners[event] = handler;
    },
    setHeader() {},
    end() {},
  };

  middleware(req, res, () => {});
  res.end();
  listeners.finish();

  assert.equal(entries[0].event, 'http_request_completed');
  assert.equal(entries[0].fields.path, '/api/items');
  assert.equal(JSON.stringify(entries).includes('secret'), false);
});
