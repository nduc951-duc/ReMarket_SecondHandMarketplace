const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('Render Blueprint separates API and one-shot expiry cron', () => {
  const blueprint = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'render.yaml'), 'utf8');

  assert.match(blueprint, /type: web/);
  assert.match(blueprint, /healthCheckPath: \/api\/health/);
  assert.match(blueprint, /type: cron/);
  assert.match(blueprint, /npm run worker:payment-expiry:once/);
  assert.match(blueprint, /DEMO_READ_ONLY_ADMIN/);
  assert.doesNotMatch(blueprint, /SUPABASE_SERVICE_ROLE_KEY:\s+\S+/);
});
