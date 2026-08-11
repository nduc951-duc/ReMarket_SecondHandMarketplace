const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = fs.readFileSync(
  path.join(__dirname, '..', 'supabase_payment_attempts.sql'),
  'utf8',
);

test('payment attempts persist status-query metadata across backend restarts', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.payment_attempts/i);
  assert.match(migration, /transaction_id UUID PRIMARY KEY REFERENCES public\.transactions/i);
  assert.match(migration, /gateway_response JSONB NOT NULL/i);
  assert.match(migration, /gateway_transaction_id TEXT/i);
});

test('payment attempts are backend-only under RLS', () => {
  assert.match(migration, /ALTER TABLE public\.payment_attempts ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON TABLE public\.payment_attempts FROM anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON TABLE public\.payment_attempts TO service_role/i);
});
