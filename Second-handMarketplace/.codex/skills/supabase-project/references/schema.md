# Supabase schema invariants

## Transactions

Migration: `backend/supabase_transaction_invariants.sql`

The database must enforce:

- At most one transaction in `awaiting_payment`, `pending`, or `confirmed` for
  each `product_id`.
- A non-empty `payment_gateway_transaction_id` can belong to only one
  transaction.

These partial unique indexes are the final protection against concurrent buyers
and replayed gateway identifiers. Application pre-checks improve error messages
but do not replace the indexes.

The migration intentionally does not delete historical duplicates. If index
creation fails, audit and resolve conflicting rows before applying it again.

## Payment callback idempotency

Migration: `backend/supabase_payment_idempotency.sql`

- `transactions.payment_gateway_transaction_id` and
  `transactions.payment_idempotency_key` are unique when populated.
- `payment_callback_events.idempotency_key` is unique and stores only a
  sanitized callback payload.
- `process_payment_callback(...)` locks the transaction and atomically validates
  provider, amount, currency, expiry, and expected payment state before updating.
- Replayed callbacks return the stored event outcome without another transaction
  transition or audit row.
- Successful payment state changes create one
  `transaction_status_audit_log` row.

Both callback/audit tables have RLS enabled. The callback RPC is executable only
by the backend service role.

## Realtime chat

Migration: `backend/supabase_realtime_chat.sql`

- `(sender_id, client_message_id)` is unique when a client message ID exists.
- `conversations`, `conversation_participants`, `chat_messages`,
  `notifications`, and `transactions` are in the `supabase_realtime`
  publication.
- Chat row visibility is determined by
  `private.is_conversation_participant(...)`.
- Conversation, participant, and message mutations remain backend/service-role
  operations.

## Database hardening

Migration: `backend/supabase_database_hardening.sql`

- Product prices must be positive and no longer have a misleading zero default.
- Buyers and sellers must differ on a transaction.
- Review ratings must be between 1 and 5; reviewer and reviewed user must differ.
- Wishlist `(user_id, product_id)` and review
  `(transaction_id, reviewer_id)` pairs are unique.
- The migration runs read-only preflight checks and fails with counts instead of
  deleting or silently rewriting invalid historical data.

## Moderation reports

Migration: `backend/supabase_moderation_reports.sql`

- `reports` stores product/user reports and the
  `submitted -> in_review -> resolved|dismissed` workflow.
- `report_audit_log` records every moderation transition and actor.
- `process_moderation_report(...)` locks the report and atomically applies warn,
  listing hide, or user suspension actions with audit and notifications.
- Both tables are backend-only under RLS; browser callers use authenticated
  Express routes.
