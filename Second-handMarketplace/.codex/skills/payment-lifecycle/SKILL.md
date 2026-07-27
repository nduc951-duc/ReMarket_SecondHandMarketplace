---
name: payment-lifecycle
description: Safely change or review ReMarket transactions and online payments. Use for transaction status transitions, MoMo or VNPAY strategies, callbacks, payment creation, gateway status queries, expiration, refunds, payment persistence, product availability, or payment-related SQL.
---

# Payment Lifecycle

Read `references/states.md` before touching transaction or payment behavior.
Also use `$supabase-project` for schema, migration, or RLS changes.

## Trace the complete flow

Inspect the route, controller, payment context/strategy, payment store,
transaction service, expiry service, and related SQL before editing.

## Preserve invariants

- Verify gateway callbacks through the selected strategy before changing state.
- Treat callbacks and status queries as replayable; preserve idempotency.
- Never trust a frontend claim that payment succeeded.
- Scope mutations to the expected current state in the database update.
- Do not revive cancelled transactions.
- Keep transaction status and payment status consistent.
- Preserve product availability updates when orders are confirmed or cancelled.
- Avoid logging signatures, secrets, or full sensitive gateway payloads.

## Verify

Test success, failure, duplicate callback, late callback, expiry, unauthorized
access, and invalid transition paths. Use `$verify-remarket` before finishing.
