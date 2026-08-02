const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = fs.readFileSync(
  path.join(__dirname, '..', 'supabase_product_transaction_reviews.sql'),
  'utf8',
);

test('product comment migration backfills product and seller from transactions', () => {
  assert.match(migration, /UPDATE public\.reviews AS review/i);
  assert.match(migration, /product_id = marketplace_transaction\.product_id/i);
  assert.match(migration, /reviewed_user_id = marketplace_transaction\.seller_id/i);
});

test('product comment trigger trusts completed transaction identity only', () => {
  assert.match(migration, /sync_review_with_completed_transaction/i);
  assert.match(migration, /marketplace_transaction\.status::TEXT <> 'completed'/i);
  assert.match(migration, /NEW\.reviewer_id IS DISTINCT FROM marketplace_transaction\.buyer_id/i);
  assert.match(migration, /NEW\.product_id := marketplace_transaction\.product_id/i);
  assert.match(migration, /NEW\.reviewed_user_id := marketplace_transaction\.seller_id/i);
});

test('product comments remain browser-readable but backend-write-only', () => {
  assert.match(migration, /ALTER TABLE public\.reviews ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /GRANT SELECT ON public\.reviews TO anon, authenticated/i);
  assert.match(
    migration,
    /REVOKE INSERT, UPDATE, DELETE ON public\.reviews FROM anon, authenticated/i,
  );
});
