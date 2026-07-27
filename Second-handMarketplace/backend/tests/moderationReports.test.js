const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { createReport, moderateReport } = require('../src/validation/requestSchemas');
const { resolveTarget } = require('../src/services/reportService');

test('report validation requires a matching target and bounded evidence', () => {
  assert.equal(
    createReport.body.safeParse({
      target_type: 'product',
      reason: 'scam',
      evidence_urls: [],
    }).success,
    false,
  );
  assert.equal(
    createReport.body.safeParse({
      target_type: 'product',
      product_id: 'product-1',
      reason: 'scam',
      evidence_urls: ['https://example.com/evidence.png'],
    }).success,
    true,
  );
});

test('moderation validation rejects terminal state without a valid action', () => {
  assert.equal(
    moderateReport.body.safeParse({
      status: 'resolved',
      action: 'delete_everything',
    }).success,
    false,
  );
});

test('reporter cannot report their own product', async () => {
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data: { id: 'product-1', seller_id: 'seller-1' }, error: null };
    },
  };

  await assert.rejects(
    () =>
      resolveTarget({ from: () => query }, 'seller-1', {
        target_type: 'product',
        product_id: 'product-1',
      }),
    (error) => error.statusCode === 403 && error.code === 'SELF_REPORT',
  );
});

test('report routes require auth and moderation roles', () => {
  const reportRouter = require('../src/routes/reportRoutes');
  const adminRouter = require('../src/routes/adminRoutes');
  const createLayer = reportRouter.stack.find((layer) => layer.route?.path === '/');
  const moderationLayer = adminRouter.stack.find((layer) => layer.route?.path === '/reports/:id');

  assert.equal(reportRouter.stack[0].handle.name, 'requireAuth');
  assert.deepEqual(
    createLayer.route.stack.map((layer) => layer.handle.name),
    ['validateRequestMiddleware', 'createReportHandler'],
  );
  assert.deepEqual(
    moderationLayer.route.stack.map((layer) => layer.handle.name),
    [
      'requireAdminOrAgent',
      'requireDemoWriteAccess',
      'validateRequestMiddleware',
      'moderateReportHandler',
    ],
  );
});

test('moderation migration is backend-only, audited, and atomic', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase_moderation_reports.sql'),
    'utf8',
  );

  assert.match(sql, /alter table public\.reports enable row level security/i);
  assert.match(sql, /revoke all on public\.reports from anon, authenticated/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /insert into public\.report_audit_log/i);
  assert.match(sql, /insert into public\.notifications/i);
  assert.match(sql, /grant execute .* to service_role/is);
});
