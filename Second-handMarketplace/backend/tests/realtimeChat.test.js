const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { createInMemorySupabase } = require('./helpers/inMemorySupabase');
const { loadWithMocks } = require('./helpers/loadWithMocks');

function createChatHarness() {
  process.env.SUPABASE_URL = 'http://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

  const memory = createInMemorySupabase({
    conversations: [{ id: 'conversation-1', created_by: 'buyer-1' }],
    conversation_participants: [
      {
        conversation_id: 'conversation-1',
        user_id: 'buyer-1',
        last_read_at: new Date(0).toISOString(),
      },
      {
        conversation_id: 'conversation-1',
        user_id: 'seller-1',
        last_read_at: new Date(0).toISOString(),
      },
    ],
    profiles: [
      { id: 'buyer-1', full_name: 'Buyer' },
      { id: 'seller-1', full_name: 'Seller' },
    ],
    chat_messages: [],
    notifications: [],
  });
  const notificationService = loadWithMocks(
    require.resolve('../src/services/notificationService'),
    {
      [require.resolve('@supabase/supabase-js')]: {
        createClient: () => memory.client,
      },
    },
  );
  const chatService = loadWithMocks(require.resolve('../src/services/chatService'), {
    [require.resolve('@supabase/supabase-js')]: {
      createClient: () => memory.client,
    },
    [require.resolve('../src/services/notificationService')]: notificationService,
  });

  return { chatService, memory };
}

test('duplicate client message ID creates one message and one notification', async () => {
  const { chatService, memory } = createChatHarness();
  const payload = {
    userId: 'buyer-1',
    conversationId: 'conversation-1',
    content: 'Is this still available?',
    clientMessageId: 'client-message-1',
  };

  const [first, second] = await Promise.all([
    chatService.sendMessage(payload),
    chatService.sendMessage(payload),
  ]);

  assert.equal(first.id, second.id);
  assert.equal(memory.database.tables.chat_messages.length, 1);
  assert.equal(memory.database.tables.notifications.length, 1);
});

test('conversation ID is rejected before an outsider can insert a message', async () => {
  const { chatService, memory } = createChatHarness();

  await assert.rejects(
    () =>
      chatService.sendMessage({
        userId: 'outsider',
        conversationId: 'conversation-1',
        content: 'Unauthorized',
        clientMessageId: 'outsider-message-1',
      }),
    (error) => error.statusCode === 403,
  );
  assert.equal(memory.database.tables.chat_messages.length, 0);
});

test('realtime migration restricts membership and publishes required tables', () => {
  const migration = readFileSync(path.join(__dirname, '..', 'supabase_realtime_chat.sql'), 'utf8');

  assert.match(migration, /SECURITY DEFINER/i);
  assert.match(migration, /private\.is_conversation_participant/i);
  assert.match(migration, /DROP POLICY IF EXISTS "Users can insert own participant row"/i);
  assert.doesNotMatch(
    migration,
    /CREATE POLICY[\s\S]{0,100}"Users can insert own participant row"/i,
  );

  for (const table of [
    'conversations',
    'conversation_participants',
    'chat_messages',
    'notifications',
    'transactions',
  ]) {
    assert.match(
      migration,
      new RegExp(`ALTER PUBLICATION supabase_realtime ADD TABLE public\\.${table}`, 'i'),
    );
  }
});
