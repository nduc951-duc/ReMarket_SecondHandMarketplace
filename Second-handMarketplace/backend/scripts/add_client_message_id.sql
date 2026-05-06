-- Migration: Add client_message_id column for idempotency support
-- This allows the server to detect duplicate messages sent on page refresh (F5)

-- Add the column (nullable, since existing messages won't have it)
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS client_message_id TEXT;

-- Create a partial unique index on (sender_id, client_message_id) where client_message_id IS NOT NULL
-- This prevents the same user from sending the same message twice (F5 / accidental double-submit)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_client_message_id
ON chat_messages (sender_id, client_message_id)
WHERE client_message_id IS NOT NULL;
