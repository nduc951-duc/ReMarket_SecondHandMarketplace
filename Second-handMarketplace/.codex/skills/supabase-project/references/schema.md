# Supabase schema invariants

## Transactions

Migration: `backend/supabase_transaction_invariants.sql`

Legacy databases must also apply
`backend/supabase_transaction_rejection_reason.sql`. It adds the
`transactions.rejection_reason` column used by seller cancellation and payment
failure/expiry flows, then asks PostgREST to reload its schema cache.

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

## Product comments from completed transactions

Migration: `backend/supabase_product_transaction_reviews.sql`

- `reviews` is the canonical product-comment source; every row remains tied to a
  completed marketplace transaction and authenticated buyer.
- A database trigger derives `product_id` and `reviewed_user_id` from the
  transaction and rejects non-buyers or non-completed transactions.
- Existing review rows are backfilled from `transactions`, so legacy comments
  become product-scoped without trusting old client payloads.
- Product detail reads reviews by `product_id`, not every review ever received by
  the seller.
- Browser roles can read comments but cannot write them directly. Inserts remain
  backend/service-role operations after transaction ownership checks.
- A trigger refreshes product rating and non-empty comment counters. The legacy
  `product_reviews` table is not deleted so existing installations can migrate safely.

## Seller follows and price notifications

Migration: `backend/supabase_seller_follows.sql`

- `(follower_id, seller_id)` is unique and self-follow is rejected by a check constraint.
- Follow mutations go through authenticated Express routes; callers cannot submit a different
  follower identity.
- When an owner changes a product price, the backend creates a product-scoped notification for
  every follower. Notification delivery failure does not roll back the product edit.

## Smart product search

Migration: `backend/supabase_smart_product_search.sql`

- Exact full-text search remains the first choice.
- `smart_product_suggestions(...)` uses accent-insensitive trigram similarity for misspellings
  and near matches when exact search/autocomplete finds nothing.
- The backend also has a bounded in-process fuzzy fallback so an unapplied RPC migration does
  not turn a harmless zero-result query into an API error.

## Hybrid vector RAG

Migration: `backend/supabase_vector_rag.sql`

- Embeddings use `extensions.vector(1536)` and HNSW cosine indexes. Changing the
  embedding dimensionality requires a coordinated schema migration.
- `ai_documents`, `ai_document_chunks`, `product_embeddings`, and
  `embedding_jobs` are backend-only under RLS.
- Product source text is derived from trusted product columns by a database
  trigger. Price, status, category, condition, and location remain SQL filters.
- Jobs use `FOR UPDATE SKIP LOCKED`, bounded retries, content hashes, and stale
  detection so an old vector cannot overwrite newer content.
- Hybrid RPCs use reciprocal-rank fusion over full-text and vector rankings.
  Lexical/fuzzy retrieval remains the runtime fallback until backfill completes.

## Moderation reports

Migration: `backend/supabase_moderation_reports.sql`

- `reports` stores product/user reports and the
  `submitted -> in_review -> resolved|dismissed` workflow.
- `report_audit_log` records every moderation transition and actor.
- `process_moderation_report(...)` locks the report and atomically applies warn,
  listing hide, or user suspension actions with audit and notifications.
- Both tables are backend-only under RLS; browser callers use authenticated
  Express routes.
