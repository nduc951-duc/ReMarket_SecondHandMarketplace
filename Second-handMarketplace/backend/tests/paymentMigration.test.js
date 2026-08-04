const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = readFileSync(
  path.join(__dirname, '..', 'supabase_payment_idempotency.sql'),
  'utf8',
);
const paymentLifecycleMigration = readFileSync(
  path.join(__dirname, '..', 'supabase_payment_lifecycle.sql'),
  'utf8',
);
const rejectionReasonMigration = readFileSync(
  path.join(__dirname, '..', 'supabase_transaction_rejection_reason.sql'),
  'utf8',
);

test('payment migration enforces callback and provider idempotency keys', () => {
  assert.match(migration, /idempotency_key TEXT NOT NULL UNIQUE/i);
  assert.match(migration, /idx_transactions_gateway_transaction_id/i);
  assert.match(migration, /idx_transactions_payment_idempotency_key/i);
});

test('payment callback RPC locks and scopes the transaction update', () => {
  assert.match(migration, /FOR UPDATE/i);
  assert.match(migration, /status = 'awaiting_payment'/i);
  assert.match(migration, /payment_status = 'pending'/i);
  assert.match(migration, /amount_mismatch/i);
  assert.match(migration, /currency_mismatch/i);
});

test('payment callback persistence is private and auditable', () => {
  assert.match(migration, /sanitized_payload JSONB/i);
  assert.match(migration, /transaction_status_audit_log/i);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /TO service_role/i);
});

test('payment lifecycle backfills the rejection reason column for legacy databases', () => {
  assert.match(
    paymentLifecycleMigration,
    /ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT ''/i,
  );
  assert.match(
    rejectionReasonMigration,
    /ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT ''/i,
  );
  assert.match(rejectionReasonMigration, /NOTIFY pgrst, 'reload schema'/i);
});
