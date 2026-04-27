const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');
const {
  createNotification,
  markConversationNotificationsAsRead,
} = require('./notificationService');

let adminClient = null;

function buildServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Thieu SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY trong backend/.env.',
    );
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

function isRelationMissing(error, relationName) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('relation')
    && message.includes('does not exist')
    && message.includes(relationName)
  );
}

function normalizeMessageContent(content) {
  return String(content || '').trim();
}

async function getConversationParticipant(userId, conversationId) {
  const client = getAdminClient();

  const { data, error } = await client
    .from('conversation_participants')
    .select('conversation_id, user_id, last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116' || isRelationMissing(error, 'conversation_participants')) {
      return null;
    }

    throw buildServiceError(`Khong the lay participant cua conversation: ${error.message}`, 500);
  }

  return data || null;
}

async function getConversations(userId) {
  const client = getAdminClient();

  const { data: myParticipantRows, error: participantError } = await client
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);

  if (participantError) {
    if (isRelationMissing(participantError, 'conversation_participants')) {
      return [];
    }

    throw buildServiceError(`Khong the lay danh sach conversation: ${participantError.message}`, 500);
  }

  if (!myParticipantRows || myParticipantRows.length === 0) {
    return [];
  }

  const conversationIds = myParticipantRows.map((item) => item.conversation_id);

  const [conversationsResponse, participantsResponse, messagesResponse] = await Promise.all([
    client
      .from('conversations')
      .select(
        `
        id,
        product_id,
        created_by,
        created_at,
        updated_at,
        product:product_id (
          id,
          seller_id,
          title,
          price,
          images,
          status
        )
      `,
      )
      .in('id', conversationIds)
      .order('updated_at', { ascending: false }),
    client
      .from('conversation_participants')
      .select(
        `
        conversation_id,
        user_id,
        last_read_at,
        profile:user_id (
          full_name,
          avatar_url
        )
      `,
      )
      .in('conversation_id', conversationIds),
    client
      .from('chat_messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false }),
  ]);

  if (conversationsResponse.error) {
    if (isRelationMissing(conversationsResponse.error, 'conversations')) {
      return [];
    }
    throw buildServiceError(`Khong the lay conversations: ${conversationsResponse.error.message}`, 500);
  }

  if (participantsResponse.error) {
    throw buildServiceError(`Khong the lay participants: ${participantsResponse.error.message}`, 500);
  }

  if (messagesResponse.error) {
    throw buildServiceError(`Khong the lay tin nhan moi nhat: ${messagesResponse.error.message}`, 500);
  }

  const participantsByConversation = new Map();
  for (const participant of participantsResponse.data || []) {
    if (!participantsByConversation.has(participant.conversation_id)) {
      participantsByConversation.set(participant.conversation_id, []);
    }
    participantsByConversation.get(participant.conversation_id).push(participant);
  }

  const latestMessageByConversation = new Map();
  for (const message of messagesResponse.data || []) {
    if (!latestMessageByConversation.has(message.conversation_id)) {
      latestMessageByConversation.set(message.conversation_id, message);
    }
  }

  const lastReadByConversation = new Map();
  for (const row of myParticipantRows) {
    lastReadByConversation.set(row.conversation_id, row.last_read_at || null);
  }

  const unreadCountByConversation = new Map();
  for (const message of messagesResponse.data || []) {
    if (message.sender_id === userId) {
      continue;
    }

    const lastReadAt = lastReadByConversation.get(message.conversation_id);
    const lastReadTimestamp = lastReadAt ? new Date(lastReadAt).getTime() : 0;
    const messageTimestamp = new Date(message.created_at).getTime();

    if (messageTimestamp > lastReadTimestamp) {
      unreadCountByConversation.set(
        message.conversation_id,
        (unreadCountByConversation.get(message.conversation_id) || 0) + 1,
      );
    }
  }

  return (conversationsResponse.data || []).map((conversation) => {
    const participants = participantsByConversation.get(conversation.id) || [];
    const peer = participants.find((participant) => participant.user_id !== userId) || null;

    return {
      ...conversation,
      participants,
      peer,
      last_read_at: lastReadByConversation.get(conversation.id) || null,
      latest_message: latestMessageByConversation.get(conversation.id) || null,
      unread_count: unreadCountByConversation.get(conversation.id) || 0,
    };
  });
}

async function getMessages(userId, conversationId, options = {}) {
  const client = getAdminClient();
  const participant = await getConversationParticipant(userId, conversationId);

  if (!participant) {
    throw buildServiceError('Ban khong co quyen xem conversation nay.', 403);
  }

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 30));
  const offset = (page - 1) * limit;

  const [messagesResponse, conversationResponse] = await Promise.all([
    client
      .from('chat_messages')
      .select(
        `
        id,
        conversation_id,
        sender_id,
        content,
        is_system,
        created_at,
        sender_profile:sender_id (
          full_name,
          avatar_url
        )
      `,
        { count: 'exact' },
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    client
      .from('conversations')
      .select(
        `
        id,
        product_id,
        created_at,
        updated_at,
        product:product_id (
          id,
          seller_id,
          title,
          images,
          price,
          status
        ),
        participants:conversation_participants (
          user_id,
          last_read_at,
          profile:user_id (
            full_name,
            avatar_url
          )
        )
      `,
      )
      .eq('id', conversationId)
      .maybeSingle(),
  ]);

  if (messagesResponse.error) {
    throw buildServiceError(`Khong the lay danh sach tin nhan: ${messagesResponse.error.message}`, 500);
  }

  if (conversationResponse.error) {
    throw buildServiceError(`Khong the lay thong tin conversation: ${conversationResponse.error.message}`, 500);
  }

  const now = new Date().toISOString();
  await client
    .from('conversation_participants')
    .update({ last_read_at: now })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  try {
    await markConversationNotificationsAsRead(userId, conversationId);
  } catch (error) {
    console.error('Mark conversation notifications read error:', error);
  }

  return {
    conversation: conversationResponse.data || null,
    messages: (messagesResponse.data || []).reverse(),
    page,
    limit,
    total: messagesResponse.count || 0,
    totalPages: Math.ceil((messagesResponse.count || 0) / limit),
  };
}

async function findSharedConversationId({ userId, receiverId, productId }) {
  const client = getAdminClient();

  const { data: mine, error: mineError } = await client
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (mineError) {
    throw buildServiceError(`Khong the lay conversation cua nguoi gui: ${mineError.message}`, 500);
  }

  const candidateIds = (mine || []).map((item) => item.conversation_id);
  if (candidateIds.length === 0) {
    return null;
  }

  const { data: receiverRows, error: receiverError } = await client
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', receiverId)
    .in('conversation_id', candidateIds);

  if (receiverError) {
    throw buildServiceError(`Khong the kiem tra conversation voi nguoi nhan: ${receiverError.message}`, 500);
  }

  const sharedIds = (receiverRows || []).map((item) => item.conversation_id);
  if (sharedIds.length === 0) {
    return null;
  }

  let query = client
    .from('conversations')
    .select('id, product_id, updated_at')
    .in('id', sharedIds)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data: conversation, error } = await query.maybeSingle();

  if (error) {
    throw buildServiceError(`Khong the tim conversation hien tai: ${error.message}`, 500);
  }

  return conversation?.id || null;
}

async function getOrCreateConversation({ userId, receiverId, productId }) {
  const client = getAdminClient();

  if (!receiverId) {
    throw buildServiceError('receiver_id la bat buoc khi tao conversation moi.', 400);
  }

  if (receiverId === userId) {
    throw buildServiceError('Khong the tu nhan tin nhan cho chinh minh.', 400);
  }

  const existingConversationId = await findSharedConversationId({
    userId,
    receiverId,
    productId,
  });

  if (existingConversationId) {
    return existingConversationId;
  }

  const now = new Date().toISOString();
  const { data: conversation, error: conversationError } = await client
    .from('conversations')
    .insert({
      product_id: productId || null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (conversationError) {
    throw buildServiceError(`Khong the tao conversation moi: ${conversationError.message}`, 500);
  }

  const { error: participantsError } = await client
    .from('conversation_participants')
    .upsert(
      [
        {
          conversation_id: conversation.id,
          user_id: userId,
          joined_at: now,
          last_read_at: now,
        },
        {
          conversation_id: conversation.id,
          user_id: receiverId,
          joined_at: now,
          last_read_at: now,
        },
      ],
      {
        onConflict: 'conversation_id,user_id',
      },
    );

  if (participantsError) {
    throw buildServiceError(`Khong the them participant vao conversation: ${participantsError.message}`, 500);
  }

  return conversation.id;
}

async function sendMessage({
  userId,
  conversationId,
  receiverId,
  productId,
  content,
}) {
  const client = getAdminClient();
  const normalizedContent = normalizeMessageContent(content);

  if (!normalizedContent) {
    throw buildServiceError('Noi dung tin nhan khong duoc de trong.', 400);
  }

  if (normalizedContent.length > 2000) {
    throw buildServiceError('Noi dung tin nhan khong duoc vuot qua 2000 ky tu.', 400);
  }

  let resolvedConversationId = String(conversationId || '').trim();

  if (resolvedConversationId) {
    const participant = await getConversationParticipant(userId, resolvedConversationId);
    if (!participant) {
      throw buildServiceError('Ban khong co quyen gui tin nhan vao conversation nay.', 403);
    }
  } else {
    resolvedConversationId = await getOrCreateConversation({
      userId,
      receiverId,
      productId,
    });
  }

  const now = new Date().toISOString();

  const { data, error } = await client
    .from('chat_messages')
    .insert({
      conversation_id: resolvedConversationId,
      sender_id: userId,
      content: normalizedContent,
      is_system: false,
      created_at: now,
    })
    .select(
      `
      id,
      conversation_id,
      sender_id,
      content,
      is_system,
      created_at,
      sender_profile:sender_id (
        full_name,
        avatar_url
      )
    `,
    )
    .single();

  if (error) {
    throw buildServiceError(`Khong the gui tin nhan: ${error.message}`, 500);
  }

  await Promise.all([
    client
      .from('conversations')
      .update({ updated_at: now })
      .eq('id', resolvedConversationId),
    client
      .from('conversation_participants')
      .update({ last_read_at: now })
      .eq('conversation_id', resolvedConversationId)
      .eq('user_id', userId),
  ]);

  const { data: participantRows, error: participantError } = await client
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', resolvedConversationId);

  if (!participantError && participantRows && participantRows.length > 0) {
    const receiverIds = participantRows
      .map((row) => row.user_id)
      .filter((id) => id && id !== userId);

    if (receiverIds.length > 0) {
      const senderName = data?.sender_profile?.full_name || 'Nguoi ban';
      const preview = normalizedContent.length > 80
        ? `${normalizedContent.slice(0, 77)}...`
        : normalizedContent;

      await Promise.all(
        receiverIds.map((targetUserId) =>
          createNotification({
            user_id: targetUserId,
            type: 'chat_message',
            title: `Tin nhan moi tu ${senderName}`,
            message: preview,
            entity_type: 'conversation',
            entity_id: resolvedConversationId,
            metadata: {
              conversation_id: resolvedConversationId,
              message_id: data.id,
              sender_id: userId,
            },
          }).catch((notificationError) => {
            console.error('Create chat notification error:', notificationError);
          }),
        ),
      );
    }
  }

  return data;
}

async function markConversationRead(userId, conversationId) {
  const client = getAdminClient();
  const participant = await getConversationParticipant(userId, conversationId);

  if (!participant) {
    throw buildServiceError('Ban khong co quyen cap nhat conversation nay.', 403);
  }

  const now = new Date().toISOString();

  const { data, error } = await client
    .from('conversation_participants')
    .update({ last_read_at: now })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw buildServiceError(`Khong the danh dau da doc: ${error.message}`, 500);
  }

  try {
    await markConversationNotificationsAsRead(userId, conversationId);
  } catch (notificationError) {
    console.error('Mark conversation notification read error:', notificationError);
  }

  return data;
}

async function getUnreadConversationCount(userId) {
  const conversations = await getConversations(userId);
  return conversations.reduce((total, conversation) => total + (conversation.unread_count || 0), 0);
}

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  getUnreadConversationCount,
};