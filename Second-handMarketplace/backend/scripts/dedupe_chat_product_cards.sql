WITH ranked_product_cards AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY conversation_id, metadata->'product'->>'id'
      ORDER BY created_at ASC, id ASC
    ) AS row_number
  FROM public.chat_messages
  WHERE is_system = TRUE
    AND metadata->>'type' = 'product_card'
    AND COALESCE(metadata->'product'->>'id', '') <> ''
)
DELETE FROM public.chat_messages
WHERE id IN (
  SELECT id
  FROM ranked_product_cards
  WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_one_product_card_per_conversation
  ON public.chat_messages (conversation_id, (metadata->'product'->>'id'))
  WHERE is_system = TRUE
    AND metadata->>'type' = 'product_card'
    AND COALESCE(metadata->'product'->>'id', '') <> '';
