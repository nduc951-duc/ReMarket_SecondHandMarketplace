const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildSeedUsers, validateSeedConfiguration } = require('../scripts/seedUsers');

test('demo seed credentials come from environment variables', () => {
  const users = buildSeedUsers({
    DEMO_ADMIN_PASSWORD: 'admin-secret-123',
    DEMO_AGENT_PASSWORD: 'agent-secret-123',
    DEMO_CUSTOMER_PASSWORD: 'customer-secret-123',
  });

  assert.equal(users[0].password, 'admin-secret-123');
  assert.equal(users[1].password, 'agent-secret-123');
  assert.equal(users[2].password, 'customer-secret-123');
});

test('demo seed rejects missing or short passwords', () => {
  const users = buildSeedUsers({});

  assert.throws(
    () =>
      validateSeedConfiguration(users, {
        SUPABASE_URL: 'https://demo.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      }),
    /at least 12 characters/,
  );
});

test('demo seed script does not contain the previous public passwords', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'seedUsers.js'), 'utf8');

  assert.doesNotMatch(source, /password:\s*['"][^'"]+['"]/);
});
