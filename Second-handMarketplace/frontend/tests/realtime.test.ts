import { expect, test } from 'vitest';

import { createRealtimeRefreshQueue, mergeRealtimeMessages } from '../src/utils/realtime';

test('realtime message reconciliation replaces optimistic message without duplicates', () => {
  const optimistic = {
    id: 'pending-client-1',
    client_message_id: 'client-1',
    content: 'Hello',
    status: 'sending',
    created_at: '2026-01-01T00:00:02.000Z',
  };
  const persisted = {
    id: 'message-1',
    client_message_id: 'client-1',
    content: 'Hello',
    created_at: '2026-01-01T00:00:02.000Z',
  };

  const messages = mergeRealtimeMessages([optimistic], [persisted, persisted]);

  expect(messages).toHaveLength(1);
  expect(messages[0].id).toBe('message-1');
  expect(messages[0].status).toBe('sent');
});

test('realtime reconciliation sorts out-of-order fetch and event arrivals', () => {
  const messages = mergeRealtimeMessages(
    [{ id: 'message-2', created_at: '2026-01-01T00:00:02.000Z' }],
    [{ id: 'message-1', created_at: '2026-01-01T00:00:01.000Z' }],
  );

  expect(messages.map((message) => message.id)).toEqual(['message-1', 'message-2']);
});

test('realtime refresh queue coalesces bursts and cancels on cleanup', async () => {
  let refreshCount = 0;
  const queue = createRealtimeRefreshQueue(() => {
    refreshCount += 1;
  }, 5);

  queue.schedule();
  queue.schedule();
  queue.schedule();
  await new Promise((resolve) => setTimeout(resolve, 15));
  expect(refreshCount).toBe(1);

  queue.schedule();
  queue.cancel();
  await new Promise((resolve) => setTimeout(resolve, 15));
  expect(refreshCount).toBe(1);
});
