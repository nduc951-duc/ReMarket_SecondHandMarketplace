import type { ChatMessagePage, Conversation, Message } from '@/types/domain';
import { apiRequest } from '@/services/apiClient';

interface MessageOptions {
  page?: number;
  limit?: number;
  markRead?: boolean;
}

interface SendMessageInput {
  conversation_id?: string;
  receiver_id?: string;
  product_id?: string;
  content: string;
  client_message_id?: string;
}

interface EnsureConversationInput {
  receiver_id: string;
  product_id?: string;
}

interface EnsureConversationResult {
  conversation_id: string;
}

interface ConversationListResult {
  conversations: Conversation[];
  unread?: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    auth: true,
    fallbackMessage: 'Không thể xử lý trò chuyện.',
  });
}

export function getConversations(): Promise<ConversationListResult> {
  return request<ConversationListResult>('/api/chat/conversations');
}

export async function getUnreadConversationCount(): Promise<number> {
  const result = await request<{ unread?: number }>('/api/chat/conversations/unread-count');
  return result?.unread || 0;
}

export function getConversationMessages(
  conversationId: string,
  options: MessageOptions = {},
): Promise<ChatMessagePage> {
  const query = new URLSearchParams();
  if (options.page) query.set('page', String(options.page));
  if (options.limit) query.set('limit', String(options.limit));
  if (options.markRead === false) query.set('mark_read', 'false');

  return request<ChatMessagePage>(
    `/api/chat/conversations/${conversationId}/messages?${query.toString()}`,
  );
}

export function sendMessage(payload: SendMessageInput): Promise<Message> {
  return request<Message>('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function ensureConversation(
  payload: EnsureConversationInput,
): Promise<EnsureConversationResult> {
  return request<EnsureConversationResult>('/api/chat/conversations/ensure', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function markConversationRead(conversationId: string): Promise<{ success?: boolean }> {
  return request<{ success?: boolean }>(`/api/chat/conversations/${conversationId}/read`, {
    method: 'PATCH',
  });
}
