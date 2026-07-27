const assert = require('node:assert/strict');
const test = require('node:test');

const app = require('../src/app');
const { errorHandler } = require('../src/middlewares/errorMiddleware');

async function withServer(run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const { port } = server.address();
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test('every response receives a request ID header', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);

    assert.equal(response.status, 200);
    assert.match(response.headers.get('x-request-id'), /^req_[0-9a-f-]+$/);
  });
});

test('unknown routes return the standardized 404 response', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/does-not-exist`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.ok, false);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'ROUTE_NOT_FOUND');
    assert.equal(body.error.requestId, response.headers.get('x-request-id'));
  });
});

test('malformed JSON returns a standardized 400 response', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payment/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"amount":',
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'INVALID_JSON');
    assert.equal(body.error.message, 'Invalid JSON payload');
    assert.equal(body.error.requestId, response.headers.get('x-request-id'));
  });
});

test('payment creation requires authentication', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payment/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'cash', amount: 0 }),
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error.code, 'UNAUTHORIZED');
    assert.equal(body.error.requestId, response.headers.get('x-request-id'));
  });
});

test('unexpected errors hide internal details from the response', () => {
  const request = { requestId: 'req_test' };
  const response = {
    headersSent: false,
    locals: {},
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  errorHandler(new Error('database password leaked'), request, response, () => {});

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.error.message, 'Internal server error');
  assert.equal(response.body.error.requestId, 'req_test');
  assert.equal('stack' in response.body.error, false);
});
