import assert from 'node:assert/strict';
import test from 'node:test';

import { createRealtimeRefreshQueue, mergeRealtimeMessages } from '../src/utils/realtime.js';

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

  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, 'message-1');
  assert.equal(messages[0].status, 'sent');
});

test('realtime reconciliation sorts out-of-order fetch and event arrivals', () => {
  const messages = mergeRealtimeMessages(
    [{ id: 'message-2', created_at: '2026-01-01T00:00:02.000Z' }],
    [{ id: 'message-1', created_at: '2026-01-01T00:00:01.000Z' }],
  );

  assert.deepEqual(
    messages.map((message) => message.id),
    ['message-1', 'message-2'],
  );
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
  assert.equal(refreshCount, 1);

  queue.schedule();
  queue.cancel();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(refreshCount, 1);
});
