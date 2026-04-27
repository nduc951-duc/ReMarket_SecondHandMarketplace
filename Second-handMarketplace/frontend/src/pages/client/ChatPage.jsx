import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  getConversationMessages,
  getConversations,
  sendMessage,
} from '../../services/chatService';
import { useAuthStore } from '../../store/authStore';

function formatTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getConversationLabel(conversation) {
  if (conversation?.peer?.profile?.full_name) {
    return conversation.peer.profile.full_name;
  }

  return 'Nguoi dung';
}

function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const selectedConversationRef = useRef('');

  const preferredConversationId = searchParams.get('conversation') || '';
  const receiverIdFromQuery = searchParams.get('receiver') || '';
  const productIdFromQuery = searchParams.get('product') || '';

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      setError('');
      const result = await getConversations();
      const nextConversations = result.conversations || [];
      setConversations(nextConversations);

      setSelectedConversationId((currentSelected) => {
        if (receiverIdFromQuery) {
          const matchedConversation = nextConversations.find((conversation) => {
            const isSameReceiver = conversation.peer?.user_id === receiverIdFromQuery;
            if (!isSameReceiver) {
              return false;
            }

            if (!productIdFromQuery) {
              return true;
            }

            return conversation.product_id === productIdFromQuery;
          });

          if (matchedConversation) {
            return matchedConversation.id;
          }
        }

        if (
          preferredConversationId
          && nextConversations.some((conversation) => conversation.id === preferredConversationId)
        ) {
          return preferredConversationId;
        }

        if (
          currentSelected
          && nextConversations.some((conversation) => conversation.id === currentSelected)
        ) {
          return currentSelected;
        }

        return nextConversations[0]?.id || '';
      });
    } catch (loadError) {
      setError(loadError.message);
      setConversations([]);
      setSelectedConversationId('');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [preferredConversationId, productIdFromQuery, receiverIdFromQuery]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      setIsLoadingMessages(true);
      setError('');
      const result = await getConversationMessages(conversationId, { limit: 50 });
      setMessages(result.messages || []);
    } catch (loadError) {
      setError(loadError.message);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
      return;
    }

    setMessages([]);
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    if (!user || !supabase) {
      return () => {};
    }

    const channel = supabase
      .channel(`chat-realtime-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const incomingConversationId = payload.new?.conversation_id;
          const currentConversationId = selectedConversationRef.current;

          loadConversations();

          if (incomingConversationId && currentConversationId === incomingConversationId) {
            loadMessages(currentConversationId);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations, loadMessages, user]);

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId);
  const canSendMessage = Boolean(messageInput.trim())
    && Boolean(selectedConversationId || receiverIdFromQuery);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const content = messageInput.trim();
    if (!content) {
      return;
    }

    try {
      setIsSending(true);
      setError('');

      const payload = { content };

      if (selectedConversationId) {
        payload.conversation_id = selectedConversationId;
      } else {
        payload.receiver_id = receiverIdFromQuery;
        if (productIdFromQuery) {
          payload.product_id = productIdFromQuery;
        }
      }

      const message = await sendMessage(payload);
      setMessageInput('');

      if (!selectedConversationId && message?.conversation_id) {
        setSelectedConversationId(message.conversation_id);
      }

      await loadConversations();
      await loadMessages(message?.conversation_id || selectedConversationId);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="page-container page-container-wide">
        <header className="chat-header">
          <div className="chat-header-left">
            <Link to="/app" className="back-link">← Quay lai</Link>
            <div>
              <h1>Tin nhan</h1>
              <p>Tro chuyen truc tiep voi nguoi mua va nguoi ban.</p>
            </div>
          </div>
        </header>

        {error && <p className="form-feedback error">{error}</p>}

        <section className="chat-layout">
          <aside className="chat-sidebar">
            <div className="chat-sidebar-head">
              <h2>Conversations</h2>
              <span>{conversations.length}</span>
            </div>

            {isLoadingConversations ? (
              <div className="chat-empty">Dang tai danh sach chat...</div>
            ) : conversations.length === 0 ? (
              <div className="chat-empty">
                Chua co cuoc tro chuyen nao. Hay mo trang san pham va bam nut nhan nguoi ban.
              </div>
            ) : (
              <div className="chat-conversation-list">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === selectedConversationId;

                  return (
                    <button
                      type="button"
                      key={conversation.id}
                      className={`chat-conversation-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedConversationId(conversation.id)}
                    >
                      <div className="chat-conversation-row">
                        <strong>{getConversationLabel(conversation)}</strong>
                        <span>{formatTime(conversation.latest_message?.created_at || conversation.updated_at)}</span>
                      </div>

                      {conversation.product?.title && (
                        <p className="chat-product-pill">{conversation.product.title}</p>
                      )}

                      <div className="chat-conversation-row">
                        <p className="chat-preview">
                          {conversation.latest_message?.content || 'Chua co tin nhan'}
                        </p>
                        {(conversation.unread_count || 0) > 0 && (
                          <span className="unread-badge">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="chat-main">
            {selectedConversation ? (
              <>
                <div className="chat-main-head">
                  <h2>{getConversationLabel(selectedConversation)}</h2>
                  {selectedConversation.product?.id && (
                    <Link to={`/products/${selectedConversation.product.id}`} className="text-link">
                      Xem san pham
                    </Link>
                  )}
                </div>

                <div className="chat-messages-wrap">
                  {isLoadingMessages ? (
                    <div className="chat-empty">Dang tai tin nhan...</div>
                  ) : messages.length === 0 ? (
                    <div className="chat-empty">Chua co tin nhan nao. Hay bat dau cuoc tro chuyen.</div>
                  ) : (
                    <div className="chat-messages-list">
                      {messages.map((message) => {
                        const isMine = message.sender_id === user?.id;

                        return (
                          <div
                            key={message.id}
                            className={`chat-bubble-row ${isMine ? 'mine' : 'other'}`}
                          >
                            <article className={`chat-bubble ${isMine ? 'mine' : 'other'}`}>
                              {!isMine && (
                                <strong className="chat-bubble-name">
                                  {message.sender_profile?.full_name || 'Nguoi dung'}
                                </strong>
                              )}
                              <p>{message.content}</p>
                              <small>{formatTime(message.created_at)}</small>
                            </article>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="chat-placeholder">
                <h2>Chon cuoc tro chuyen</h2>
                <p>
                  {receiverIdFromQuery
                    ? 'Ban co the gui tin nhan dau tien de bat dau cuoc tro chuyen moi.'
                    : 'Hay chon mot conversation ben trai de xem noi dung.'}
                </p>
              </div>
            )}

            <form className="chat-compose" onSubmit={handleSendMessage}>
              <textarea
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder="Nhap tin nhan..."
                rows={2}
                disabled={isSending}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={isSending || !canSendMessage}
              >
                {isSending ? 'Dang gui...' : 'Gui'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ChatPage;