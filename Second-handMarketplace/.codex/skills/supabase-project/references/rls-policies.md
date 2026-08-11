# ReMarket RLS policies

## Realtime chat

Migration: `backend/supabase_realtime_chat.sql`

- Authenticated users can select a conversation, its participant rows, and its
  messages only when `private.is_conversation_participant(conversation_id)`
  succeeds for `auth.uid()`.
- The membership helper is a `SECURITY DEFINER` function in the unexposed
  `private` schema so policy evaluation does not recursively query
  `conversation_participants` through its own RLS policy.
- Browser clients cannot insert conversation participant rows. Conversation
  creation, membership, messages, and read-state mutations go through the
  authenticated Express API using the service-role client.
- Notification rows remain visible only to their `user_id`.
- Transaction rows remain visible only to their buyer or seller.

Realtime Postgres Changes applies these SELECT policies before delivering rows
to a subscriber. Client-side filters reduce traffic but do not replace RLS.

## Browser/backend access boundary

Migration: `backend/supabase_database_hardening.sql`

| Tables | Browser access | Write owner |
| --- | --- | --- |
| `products`, `reviews`, `product_reviews`, optional `categories` | Public/authenticated SELECT under RLS | Express service-role client |
| `profiles` | Authenticated user can SELECT their own row | Express service-role client and auth trigger |
| `transactions` | Buyer/seller SELECT under RLS for realtime | Express service-role client |
| `conversations`, `conversation_participants`, `chat_messages` | Participant SELECT under RLS for realtime | Express service-role client |
| `notifications` | Recipient SELECT under RLS for realtime | Express service-role client |
| `wishlists`, `product_views` | No direct browser table access | Express service-role client |
| `payment_callback_events`, `transaction_status_audit_log` | No browser access | Payment callback RPC/service role |
| `payment_attempts` | No browser access | Express payment service/service role |
| `reports`, `report_audit_log` | No direct browser access | Authenticated Express moderation routes/service role |
| `rag_retrieval_logs` | No browser access | Express RAG observability service/service role |

All application tables in `public` have RLS enabled. `anon` and
`authenticated` receive no direct `INSERT`, `UPDATE`, or `DELETE` privileges.
Express mutation handlers derive actor identity from the verified Supabase
access token (`req.user.id`); identity fields in request payloads are ignored.
