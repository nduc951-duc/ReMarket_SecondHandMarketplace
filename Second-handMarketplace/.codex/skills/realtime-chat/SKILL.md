---
name: realtime-chat
description: Safely change or review ReMarket chat, realtime subscriptions, notifications, unread badges, conversation membership, message deduplication, product cards, and read-state behavior across React, Express, and Supabase.
---

# Realtime Chat

Read `references/chat-flow.md` before changing chat, notifications, or unread
badges. Use `$supabase-project` for schema, realtime publication, migration, or
RLS changes.

## Preserve boundaries

- Authenticate every chat and notification route.
- Verify conversation membership on the backend before reads or writes.
- Do not accept sender identity from the frontend as authority.
- Keep message validation and product-card authorization in the backend service.
- Preserve `last_read_at` and conversation-scoped notification read behavior.
- Treat client message IDs as idempotency keys when present.

## Realtime behavior

- Subscribe only after the authenticated user and required IDs exist.
- Filter events as narrowly as Supabase permits.
- Reconcile realtime events with fetched state without duplicating messages.
- Clean up channels on dependency change and component unmount.
- Avoid stale closures in callbacks and avoid creating one channel per render.
- Keep badge counts recoverable through a fresh server fetch.

## Verify

Test two participants, unauthorized access, self-chat rejection, duplicate send,
reconnect, out-of-order fetch/event arrival, read-state updates, unmount cleanup,
and missing optional relations. Finish with `$verify-remarket`.
