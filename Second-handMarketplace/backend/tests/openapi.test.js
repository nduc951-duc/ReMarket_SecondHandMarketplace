const assert = require('node:assert/strict');
const test = require('node:test');

const app = require('../src/app');
const openapiDocument = require('../src/docs/openapi');

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

test('OpenAPI document exposes required groups and Bearer JWT auth', () => {
  assert.equal(openapiDocument.openapi, '3.0.3');
  assert.deepEqual(
    openapiDocument.tags.map((tag) => tag.name),
    ['Auth', 'Products', 'Transactions', 'Payment', 'Admin'],
  );
  assert.deepEqual(openapiDocument.components.securitySchemes.bearerAuth, {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Supabase access token. Enter the JWT without adding another Bearer prefix.',
  });
});

test('OpenAPI document covers the initial Auth, Product, Transaction, and Payment APIs', () => {
  const requiredOperations = [
    ['/api/auth/register', 'post'],
    ['/api/auth/change-password', 'post'],
    ['/api/products', 'get'],
    ['/api/products', 'post'],
    ['/api/products/{id}', 'patch'],
    ['/api/transactions', 'post'],
    ['/api/transactions/{id}/status', 'patch'],
    ['/api/payment/create', 'post'],
    ['/api/payment/ipn/{method}', 'post'],
    ['/api/payment/refund', 'post'],
  ];

  for (const [path, method] of requiredOperations) {
    const operation = openapiDocument.paths[path]?.[method];
    assert.ok(operation, `${method.toUpperCase()} ${path} must be documented`);
    assert.ok(operation.tags?.length, `${method.toUpperCase()} ${path} must have a tag`);
    assert.ok(operation.description, `${method.toUpperCase()} ${path} must describe authorization`);
    assert.ok(operation['x-roles']?.length, `${method.toUpperCase()} ${path} must declare roles`);
    assert.ok(operation.responses, `${method.toUpperCase()} ${path} must declare responses`);
  }
});

test('protected and public operations declare accurate security requirements', () => {
  assert.deepEqual(openapiDocument.paths['/api/products'].post.security, [{ bearerAuth: [] }]);
  assert.deepEqual(openapiDocument.paths['/api/payment/refund'].post['x-roles'], ['admin']);
  assert.deepEqual(openapiDocument.paths['/api/payment/ipn/{method}'].post.security, []);
  assert.deepEqual(openapiDocument.paths['/api/auth/register'].post.security, []);
});

test('Swagger UI and raw OpenAPI JSON are publicly reachable', async () => {
  await withServer(async (baseUrl) => {
    const documentResponse = await fetch(`${baseUrl}/api/docs/openapi.json`);
    const document = await documentResponse.json();
    const uiResponse = await fetch(`${baseUrl}/api/docs/`);
    const html = await uiResponse.text();

    assert.equal(documentResponse.status, 200);
    assert.equal(document.info.title, 'ReMarket API');
    assert.equal(uiResponse.status, 200);
    assert.match(html, /ReMarket API Docs/);
    assert.match(uiResponse.headers.get('content-type'), /text\/html/);
  });
});
