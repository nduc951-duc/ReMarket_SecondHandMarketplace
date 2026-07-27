function messageIdentity(message) {
  return message?.client_message_id || message?.id || '';
}

export function mergeRealtimeMessages(currentMessages, incomingMessages) {
  const messagesByIdentity = new Map();

  for (const message of [...currentMessages, ...incomingMessages]) {
    const identity = messageIdentity(message);
    if (!identity) continue;

    const existing = messagesByIdentity.get(identity);
    const merged = existing ? { ...existing, ...message } : message;
    if (existing?.status && message.id && !String(message.id).startsWith('pending-')) {
      merged.status = 'sent';
    }
    messagesByIdentity.set(identity, merged);
  }

  return Array.from(messagesByIdentity.values()).sort((left, right) => {
    const timeDifference =
      new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime();
    return timeDifference || String(left.id || '').localeCompare(String(right.id || ''));
  });
}

export function createRealtimeRefreshQueue(refresh, delay = 75) {
  let timeoutId = null;

  function cancel() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function flush() {
    cancel();
    return refresh();
  }

  function schedule() {
    cancel();
    timeoutId = setTimeout(() => {
      timeoutId = null;
      refresh();
    }, delay);
  }

  return { cancel, flush, schedule };
}
