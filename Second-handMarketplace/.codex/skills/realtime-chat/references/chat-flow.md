# Chat and realtime flow

## Backend

- Routes: `backend/src/routes/chatRoutes.js` and `notificationRoutes.js`
- Controllers: `backend/src/controllers/chatController.js` and
  `notificationController.js`
- Services: `backend/src/services/chatService.js` and `notificationService.js`

The backend verifies membership through `conversation_participants`. Messages
must be non-empty and no longer than 2,000 characters. Users cannot create a
direct conversation with themselves. Product cards must match the authorized
conversation and seller context.

Read state is stored with participant `last_read_at`. Marking a conversation read
also marks conversation-scoped notifications read.

## Frontend

- Page: `frontend/src/pages/client/ChatPage.jsx`
- API service: `frontend/src/services/chatService.js`
- Notification API: `frontend/src/services/notificationService.js`
- Realtime badges: `frontend/src/hooks/useRealtimeBadges.js`

The server remains the source of truth for authorization and unread counts.
Realtime events accelerate the UI but must not be the only recovery path.

`ChatPage` uses a membership-protected user feed for conversation previews and a
second subscription filtered to the active `conversation_id`. Optimistic and
database messages reconcile by `client_message_id`. Visibility/focus and channel
reconnects trigger a fresh server fetch instead of continuous polling.

Notifications are filtered by `user_id`. Transaction history subscribes
separately to buyer and seller rows. Unread badges react to messages,
notifications, and the authenticated user's participant read-state changes.

## SQL

- `backend/scripts/enable_chat_realtime.sql`
- `backend/scripts/add_client_message_id.sql`
- `backend/scripts/dedupe_chat_product_cards.sql`
- `backend/supabase_realtime_chat.sql`

Review publication membership, uniqueness constraints, and RLS whenever realtime
tables or message identity changes.
