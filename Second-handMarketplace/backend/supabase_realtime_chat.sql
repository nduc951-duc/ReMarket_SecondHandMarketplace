-- Secure Supabase Realtime for chat, notifications, transactions, and unread state.
-- Apply after supabase_migration_fixed.sql.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_conversation_participant(
  p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants AS participant
    WHERE participant.conversation_id = p_conversation_id
      AND participant.user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION private.is_conversation_participant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_conversation_participant(UUID)
  TO authenticated, service_role;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS client_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_client_message_id
  ON public.chat_messages(sender_id, client_message_id)
  WHERE client_message_id IS NOT NULL
    AND client_message_id <> '';

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read own conversations"
  ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations"
  ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations"
  ON public.conversations;
DROP POLICY IF EXISTS "Participants can read participant rows"
  ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update own participant row"
  ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can insert own participant row"
  ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can read messages"
  ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can insert own messages"
  ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own notifications"
  ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications"
  ON public.notifications;

CREATE POLICY "Participants can read own conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (private.is_conversation_participant(id));

CREATE POLICY "Participants can read participant rows"
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (private.is_conversation_participant(conversation_id));

CREATE POLICY "Participants can read messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (private.is_conversation_participant(conversation_id));

-- Mutations remain backend-only through the existing service-role policies.
-- This prevents a browser client from adding itself to an arbitrary conversation.
GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversation_participants TO authenticated;
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.transactions TO authenticated;

ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_participants REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
