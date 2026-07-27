# Transaction and payment states

## Transaction status

The migration permits:

```text
awaiting_payment
pending
confirmed
shipped
completed
cancelled
```

Observed business transitions:

```text
online create: awaiting_payment
COD create:    pending
payment paid:  awaiting_payment -> pending
seller accept: pending -> confirmed
seller ships:  confirmed -> shipped
buyer receives: shipped -> completed
reject/cancel: pending|confirmed -> cancelled
payment fail:  awaiting_payment -> cancelled
payment expiry: awaiting_payment -> cancelled
```

Seller-only operations include accepting, shipping, and rejecting a pending
order. Buyer-only completion confirms receipt. A rejection from `pending`
requires a reason.

## Payment status

The migration permits:

```text
unpaid
pending
paid
failed
expired
cod
```

An online order begins with `payment_status=pending`. Successful verified
payment records `paid`, `paid_at`, and the gateway transaction ID. Failure or
expiry cancels the transaction and records failure timing.

Verified MoMo/VNPAY callbacks are passed to the
`process_payment_callback(...)` Supabase function. The function serializes
updates with a row lock, checks amount/currency/expiry/current state, and uses a
unique callback idempotency key. Duplicate callbacks are acknowledged without
repeating the state transition. Sanitized callback events and payment-driven
status audit rows are persisted separately.

## Important files

- `backend/src/routes/paymentRoutes.js`
- `backend/src/controllers/paymentController.js`
- `backend/src/contexts/PaymentContext.js`
- `backend/src/strategies/PaymentStrategy.js`
- `backend/src/strategies/MomoStrategy.js`
- `backend/src/strategies/VnpayStrategy.js`
- `backend/src/services/paymentStore.js`
- `backend/src/services/paymentCallbackService.js`
- `backend/src/services/transactionService.js`
- `backend/src/workers/paymentExpiryWorker.js`
- `backend/supabase_payment_lifecycle.sql`
- `backend/supabase_payment_idempotency.sql`
