import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  getConversationMessages,
  getConversations,
  ensureConversation,
  sendMessage,
} from '../../services/chatService';
import { useAuthStore } from '../../store/authStore';

/* ──────────────────────────────────────────────────────────
   Utility helpers
   ────────────────────────────────────────────────────────── */

function generateClientMessageId() {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

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

function getInitials(label) {
  const safeLabel = String(label || '').trim();
  if (!safeLabel) {
    return 'U';
  }

  const parts = safeLabel.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/* ──────────────────────────────────────────────────────────
   ChatPage component
   ────────────────────────────────────────────────────────── */

function ChatPage({
  defaultReceiverId = '',
  disableProductCard = false,
  headerLabel = 'Tin nhan',
}) {
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const selectedConversationRef = useRef('');
  const messagesEndRef = useRef(null);

  const preferredConversationId = searchParams.get('conversation') || '';
  const receiverIdFromQuery = searchParams.get('receiver') || '';
  const productIdFromQuery = searchParams.get('product') || '';
  const normalizedDefaultReceiverId = String(defaultReceiverId || '').trim();
  const effectiveReceiverId = receiverIdFromQuery || normalizedDefaultReceiverId;
  const allowProductCard = Boolean(productIdFromQuery) && !disableProductCard;
  const ensuredConversationRef = useRef('');

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  // Track sent client_message_ids to prevent duplicates from realtime
  const sentClientIdsRef = useRef(new Set());

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      setError('');
      const result = await getConversations();
      const nextConversations = result.conversations || [];
      setConversations(nextConversations);

      setSelectedConversationId((currentSelected) => {
        if (effectiveReceiverId) {
          const matchedConversation = nextConversations.find((conversation) => {
            const isSameReceiver = conversation.peer?.user_id === effectiveReceiverId;
            if (!isSameReceiver) {
              return false;
            }

            return true;
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
  }, [effectiveReceiverId, preferredConversationId]);

  useEffect(() => {
    if (!effectiveReceiverId) {
      return;
    }

    const ensureKey = `${effectiveReceiverId}:${allowProductCard ? productIdFromQuery : ''}`;
    if (ensuredConversationRef.current === ensureKey) {
      return;
    }

    ensuredConversationRef.current = ensureKey;

    const ensure = async () => {
      try {
        const result = await ensureConversation({
          receiver_id: effectiveReceiverId,
          product_id: allowProductCard ? productIdFromQuery : undefined,
        });

        if (result?.conversation_id) {
          setSelectedConversationId((currentSelected) => currentSelected || result.conversation_id);
        }

        await loadConversations();
      } catch (ensureError) {
        setError(ensureError.message);
      }
    };

    ensure();
  }, [allowProductCard, effectiveReceiverId, loadConversations, productIdFromQuery]);

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

  /* ────────────────────────────────────────────
     Bug 3 fix: Smart realtime — append only
     ──────────────────────────────────────────── */
  useEffect(() => {
    if (!user || !supabase || !selectedConversationId) {
      return () => {};
    }

    const channel = supabase
      .channel(`chat-messages:${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          // If the message was sent by the current user (optimistic already shown),
          // just update the optimistic message status to 'sent'
          if (newMsg.sender_id === user.id) {
            setMessages((prev) => {
              // Check if this message was already added optimistically
              const hasOptimistic = prev.some(
                (m) => m._clientMessageId && m._clientMessageId === newMsg.client_message_id,
              );

              if (hasOptimistic) {
                // Replace the optimistic message with the real one
                return prev.map((m) => {
                  if (m._clientMessageId && m._clientMessageId === newMsg.client_message_id) {
                    return {
                      ...newMsg,
                      sender_profile: m.sender_profile,
                      _status: 'sent',
                    };
                  }
                  return m;
                });
              }

              // If it's our message but not optimistic (e.g. from another tab),
              // don't add duplicate — check by real id
              if (prev.some((m) => m.id === newMsg.id)) {
                return prev;
              }

              return [...prev, { ...newMsg, _status: 'sent' }];
            });
          } else {
            // Message from another user — append to current conversation
            setMessages((prev) => {
              // Don't duplicate
              if (prev.some((m) => m.id === newMsg.id)) {
                return prev;
              }
              return [...prev, newMsg];
            });
          }

          // Update conversation list locally for the active conversation
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === selectedConversationId);
            if (idx === -1) return prev;

            const updated = [...prev];
            const conv = { ...updated[idx] };
            conv.latest_message = newMsg;
            conv.updated_at = newMsg.created_at;
            updated[idx] = conv;

            // Re-sort: most recently updated first
            updated.sort((a, b) => {
              const dateA = new Date(a.updated_at || 0).getTime();
              const dateB = new Date(b.updated_at || 0).getTime();
              return dateB - dateA;
            });

            return updated;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId, user]);


  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId);
  const canSendMessage = Boolean(messageInput.trim())
    && Boolean(selectedConversationId || effectiveReceiverId);

  /* ────────────────────────────────────────────
     Bug 1 fix: Optimistic send
     Bug 5 fix: Idempotency key
     ──────────────────────────────────────────── */
  const handleSendMessage = async (event) => {
    if (event) event.preventDefault();

    const content = messageInput.trim();
    if (!content) {
      return;
    }

    // Generate a unique client message id for idempotency (Bug 5)
    const clientMessageId = generateClientMessageId();
    sentClientIdsRef.current.add(clientMessageId);

    // Optimistic: create a temporary message to display immediately (Bug 1)
    const optimisticMessage = {
      id: `optimistic-${clientMessageId}`,
      _clientMessageId: clientMessageId,
      conversation_id: selectedConversationId,
      sender_id: user?.id,
      content,
      is_system: false,
      metadata: null,
      created_at: new Date().toISOString(),
      sender_profile: {
        id: user?.id,
        full_name: user?.user_metadata?.full_name || 'Ban',
      },
      _status: 'sending', // optimistic status
    };

    // Immediately show the message and clear input
    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageInput('');

    // Update conversation list preview locally
    setConversations((prev) => {
      const convId = selectedConversationId;
      const idx = prev.findIndex((c) => c.id === convId);
      if (idx === -1) return prev;

      const updated = [...prev];
      const conv = { ...updated[idx] };
      conv.latest_message = {
        content,
        created_at: optimisticMessage.created_at,
        is_system: false,
      };
      conv.updated_at = optimisticMessage.created_at;
      updated[idx] = conv;

      // Move to top
      updated.sort((a, b) => {
        const dateA = new Date(a.updated_at || 0).getTime();
        const dateB = new Date(b.updated_at || 0).getTime();
        return dateB - dateA;
      });

      return updated;
    });

    try {
      setIsSending(true);
      setError('');

      const payload = {
        content,
        client_message_id: clientMessageId,
      };

      if (selectedConversationId) {
        payload.conversation_id = selectedConversationId;
      } else {
        payload.receiver_id = effectiveReceiverId;
        if (allowProductCard) {
          payload.product_id = productIdFromQuery;
        }
      }

      const serverMessage = await sendMessage(payload);

      // If we didn't have a conversation before, set it now
      if (!selectedConversationId && serverMessage?.conversation_id) {
        setSelectedConversationId(serverMessage.conversation_id);
        // Reload conversations to get the newly created one in the list
        loadConversations();
      }

      // Update optimistic message with server data → mark as 'sent'
      setMessages((prev) =>
        prev.map((m) => {
          if (m._clientMessageId === clientMessageId) {
            return {
              ...serverMessage,
              _clientMessageId: clientMessageId,
              _status: 'sent',
            };
          }
          return m;
        }),
      );
    } catch (sendError) {
      setError(sendError.message);

      // Mark optimistic message as failed (Bug 1 — acceptance criteria #6)
      setMessages((prev) =>
        prev.map((m) => {
          if (m._clientMessageId === clientMessageId) {
            return {
              ...m,
              _status: 'failed',
              _failedContent: content,
              _failedPayload: {
                content,
                client_message_id: clientMessageId,
                conversation_id: selectedConversationId,
                receiver_id: !selectedConversationId ? effectiveReceiverId : undefined,
                product_id: !selectedConversationId && allowProductCard ? productIdFromQuery : undefined,
              },
            };
          }
          return m;
        }),
      );
    } finally {
      setIsSending(false);
    }
  };

  /* ────────────────────────────────────────────
     Retry a failed message
     ──────────────────────────────────────────── */
  const handleRetryMessage = async (failedMessage) => {
    if (!failedMessage._failedPayload) return;

    // Mark as sending again
    setMessages((prev) =>
      prev.map((m) => {
        if (m._clientMessageId === failedMessage._clientMessageId) {
          return { ...m, _status: 'sending' };
        }
        return m;
      }),
    );

    try {
      setError('');
      const serverMessage = await sendMessage(failedMessage._failedPayload);

      setMessages((prev) =>
        prev.map((m) => {
          if (m._clientMessageId === failedMessage._clientMessageId) {
            return {
              ...serverMessage,
              _clientMessageId: failedMessage._clientMessageId,
              _status: 'sent',
            };
          }
          return m;
        }),
      );
    } catch (retryError) {
      setError(retryError.message);

      setMessages((prev) =>
        prev.map((m) => {
          if (m._clientMessageId === failedMessage._clientMessageId) {
            return { ...m, _status: 'failed' };
          }
          return m;
        }),
      );
    }
  };

  /* ────────────────────────────────────────────
     Bug 2 fix: Enter to send, Shift+Enter for newline
     ──────────────────────────────────────────── */
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const content = messageInput.trim();
      if (!content || isSending) return;
      if (!selectedConversationId && !effectiveReceiverId) return;
      handleSendMessage();
    }
    // Shift+Enter → default behavior (new line) — no action needed
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const renderMessageContent = (message) => {
    if (message.is_system && message.metadata?.type === 'product_card') {
      const product = message.metadata?.product || {};

      return (
        <div className="chat-system-card">
          <span className="chat-system-label">
            {message.metadata?.label || 'Ban dang hoi ve san pham nay'}
          </span>
          <Link
            to={product.url || `/products/${product.id || ''}`}
            className="chat-product-card"
          >
            <div className="chat-product-thumb">
              {product.image_url ? (
                <img src={product.image_url} alt={product.title || 'San pham'} />
              ) : (
                <span>📦</span>
              )}
            </div>
            <div className="chat-product-meta">
              <strong>{product.title || 'San pham'}</strong>
              <span>{formatCurrency(product.price)}</span>
            </div>
          </Link>
          <small className="chat-system-time">{formatTime(message.created_at)}</small>
        </div>
      );
    }

    const isMine = message.sender_id === user?.id;
    const status = message._status;

    return (
      <article className={`chat-bubble ${isMine ? 'mine' : 'other'}`}>
        {!isMine && (
          <strong className="chat-bubble-name">
            {message.sender_profile?.full_name || 'Nguoi dung'}
          </strong>
        )}
        <p>{message.content}</p>
        <div className="chat-bubble-footer">
          <small>{formatTime(message.created_at)}</small>
          {/* Optimistic UI status indicators */}
          {isMine && status === 'sending' && (
            <span className="chat-bubble-status sending">✓ Đang gửi</span>
          )}
          {isMine && status === 'sent' && (
            <span className="chat-bubble-status sent">✓✓ Đã gửi</span>
          )}
          {isMine && status === 'failed' && (
            <span className="chat-bubble-status failed">
              ✕ Gửi thất bại
              <button
                type="button"
                className="chat-retry-btn"
                onClick={() => handleRetryMessage(message)}
              >
                ↻ Thử lại
              </button>
            </span>
          )}
        </div>
      </article>
    );
  };

  return (
    <main className="page-shell">
      <div className="page-container page-container-wide">
        <header className="chat-header">
          <div className="chat-header-left">
            <Link to="/app" className="back-link">← Quay lai</Link>
            <div>
              <h1>{headerLabel}</h1>
              <p>Tro chuyen truc tiep voi nguoi mua va nguoi ban.</p>
            </div>
          </div>
        </header>

        {error && <p className="form-feedback error">{error}</p>}

        <section className="chat-layout">
          <aside className="chat-sidebar">
            <div className="chat-sidebar-head">
              <h2>Cac cuoc hoi thoai</h2>
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
                  const latestMessage = conversation.latest_message;
                  const latestProductTitle = latestMessage?.metadata?.product?.title;
                  const previewText = latestMessage?.is_system
                    && latestMessage?.metadata?.type === 'product_card'
                    ? `Dang hoi ve san pham: ${latestProductTitle || 'San pham'}`
                    : latestMessage?.content || 'Chua co tin nhan';
                  const conversationLabel = getConversationLabel(conversation);
                  const avatarLabel = getInitials(conversationLabel);

                  return (
                    <button
                      type="button"
                      key={conversation.id}
                      className={`chat-conversation-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedConversationId(conversation.id)}
                    >
                      <div className="chat-conversation-row">
                        <div className="chat-avatar">{avatarLabel}</div>
                        <div className="chat-conversation-info">
                          <div className="chat-conversation-top">
                            <strong>{conversationLabel}</strong>
                            <span>{formatTime(latestMessage?.created_at || conversation.updated_at)}</span>
                          </div>
                          {latestProductTitle && (
                            <p className="chat-product-pill">{latestProductTitle}</p>
                          )}
                          <div className="chat-conversation-bottom">
                            <p className="chat-preview">{previewText}</p>
                            {(conversation.unread_count || 0) > 0 && (
                              <span className="unread-badge">
                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
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
                  <div className="chat-main-title">
                    <div className="chat-avatar large">
                      {getInitials(getConversationLabel(selectedConversation))}
                    </div>
                    <div>
                      <h2>{getConversationLabel(selectedConversation)}</h2>
                      <p className="chat-status">Truc tuyen</p>
                    </div>
                  </div>
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
                        const rowClass = message.is_system && message.metadata?.type === 'product_card'
                          ? 'system'
                          : isMine
                            ? 'mine'
                            : 'other';

                        return (
                          <div
                            key={message.id}
                            className={`chat-bubble-row ${rowClass}`}
                          >
                            {renderMessageContent(message)}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="chat-placeholder">
                <h2>Chon cuoc tro chuyen</h2>
                <p>
                  {effectiveReceiverId
                    ? 'Ban co the gui tin nhan dau tien de bat dau cuoc tro chuyen moi.'
                    : 'Hay chon mot conversation ben trai de xem noi dung.'}
                </p>
              </div>
            )}

            <form className="chat-compose" onSubmit={handleSendMessage}>
              <div className="chat-input-shell">
                <button
                  type="button"
                  className="chat-attach-btn"
                  title="Dinh kem"
                  aria-label="Dinh kem"
                  disabled
                >
                  Attach
                </button>
                <textarea
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhap tin nhan..."
                  rows={2}
                  disabled={isSending}
                />
              </div>
              <button
                type="submit"
                className="chat-send-btn"
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