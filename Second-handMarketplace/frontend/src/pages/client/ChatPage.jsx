import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  RefreshCcw,
  Search,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ChatEmptyState } from '../../components/chat/ChatEmptyState';
import { ChatMessageBubble } from '../../components/chat/ChatMessageBubble';
import { ChatProductCard } from '../../components/chat/ChatProductCard';
import { MarketplaceLayout } from '../../components/layout/MarketplaceLayout';
import { supabase } from '../../lib/supabaseClient';
import {
  ensureConversation,
  getConversationMessages,
  getConversations,
  markConversationRead,
  sendMessage,
} from '../../services/chatService';
import { useAuthStore } from '../../store/authStore';
import { mergeRealtimeMessages } from '../../utils/realtime';

const MESSAGE_LIMIT = 80;

function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatConversationTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();

  if (isSameDay) {
    return formatTime(value);
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function getInitials(name) {
  const normalized = String(name || '').trim();
  if (!normalized) return 'U';

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getPeer(conversation, currentUserId) {
  if (conversation?.peer) return conversation.peer;
  return (conversation?.participants || []).find((item) => item.user_id !== currentUserId) || null;
}

function getPeerName(conversation, currentUserId) {
  const peer = getPeer(conversation, currentUserId);
  return peer?.profile?.full_name || 'Người dùng';
}

function getPreview(message) {
  if (!message) return 'Chưa có tin nhắn';
  if (message.is_system && message.metadata?.type === 'product_card') {
    return message.metadata?.product?.title || 'Đang hỏi về sản phẩm';
  }

  return message.content || 'Tin nhắn mới';
}

function ChatPage({
  defaultReceiverId = '',
  disableProductCard = false,
  headerLabel = 'Tin nhắn',
}) {
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const queryReceiverId = String(searchParams.get('receiver') || '').trim();
  const queryProductId = String(searchParams.get('product') || '').trim();
  const receiverId = queryReceiverId || defaultReceiverId;
  const productId = disableProductCard ? '' : queryProductId;

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [conversationDetail, setConversationDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [filterText, setFilterText] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(supabase ? 'connecting' : 'offline');

  const endRef = useRef(null);
  const initializedRef = useRef(false);
  const activeConversationIdRef = useRef('');
  const lastReadMessageIdRef = useRef('');

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const filteredConversations = useMemo(() => {
    const keyword = filterText.trim().toLowerCase();
    if (!keyword) return conversations;

    return conversations.filter((conversation) => {
      const peerName = getPeerName(conversation, user?.id).toLowerCase();
      const productTitle = String(conversation?.product?.title || '').toLowerCase();
      const preview = getPreview(conversation.latest_message).toLowerCase();
      return (
        peerName.includes(keyword) || productTitle.includes(keyword) || preview.includes(keyword)
      );
    });
  }, [conversations, filterText, user?.id]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || conversationDetail,
    [activeConversationId, conversationDetail, conversations],
  );

  const loadConversations = useCallback(async ({ keepSelection = true } = {}) => {
    try {
      setError('');
      const data = await getConversations();
      const nextConversations = data?.conversations || [];
      setConversations(nextConversations);

      if (!keepSelection && nextConversations[0]) {
        setActiveConversationId(nextConversations[0].id);
      }

      if (keepSelection && !activeConversationIdRef.current && nextConversations[0]) {
        setActiveConversationId(nextConversations[0].id);
      }

      if (
        keepSelection &&
        activeConversationIdRef.current &&
        !nextConversations.some((item) => item.id === activeConversationIdRef.current) &&
        nextConversations[0]
      ) {
        setActiveConversationId(nextConversations[0].id);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách trò chuyện.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (conversationId, { silent = false, markRead = true } = {}) => {
      if (!conversationId) return;

      try {
        if (!silent) setIsLoadingMessages(true);
        setError('');
        const data = await getConversationMessages(conversationId, {
          limit: MESSAGE_LIMIT,
          markRead,
        });
        if (conversationId !== activeConversationIdRef.current) return;

        const nextMessages = data?.messages || [];
        setConversationDetail(data?.conversation || null);
        setMessages((current) => mergeRealtimeMessages(current, nextMessages));

        const latestMessage = nextMessages[nextMessages.length - 1];
        if (markRead && latestMessage?.id && lastReadMessageIdRef.current !== latestMessage.id) {
          lastReadMessageIdRef.current = latestMessage.id;
          await markConversationRead(conversationId).catch(() => {});
        }
      } catch (err) {
        setError(err.message || 'Không thể tải tin nhắn.');
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadConversations({ keepSelection: true });
  }, [loadConversations]);

  useEffect(() => {
    if (initializedRef.current || !receiverId) return;

    initializedRef.current = true;
    let ignore = false;

    async function prepareConversation() {
      try {
        setIsLoadingConversations(true);
        const ensureCacheKey = productId
          ? `remarket_chat_ensure_${user?.id || 'guest'}_${receiverId}_${productId}`
          : '';
        if (ensureCacheKey) {
          try {
            const cached = JSON.parse(sessionStorage.getItem(ensureCacheKey) || 'null');
            if (cached?.conversationId && Date.now() - cached.savedAt < 60_000) {
              setActiveConversationId(cached.conversationId);
              await loadConversations({ keepSelection: true });
              return;
            }
          } catch {
            // Cache only prevents duplicate product cards during dev remounts.
          }
        }

        const data = await ensureConversation({
          receiver_id: receiverId,
          product_id: productId || undefined,
        });

        if (ignore) return;
        const nextConversationId = data?.conversation_id;
        if (nextConversationId) {
          if (ensureCacheKey) {
            try {
              sessionStorage.setItem(
                ensureCacheKey,
                JSON.stringify({
                  conversationId: nextConversationId,
                  savedAt: Date.now(),
                }),
              );
            } catch {
              // Cache is optional.
            }
          }
          setActiveConversationId(nextConversationId);
          await loadConversations({ keepSelection: true });
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Không thể tạo cuộc trò chuyện.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingConversations(false);
        }
      }
    }

    prepareConversation();

    return () => {
      ignore = true;
    };
  }, [loadConversations, productId, receiverId, user?.id]);

  useEffect(() => {
    if (!activeConversationId) {
      setConversationDetail(null);
      setMessages([]);
      lastReadMessageIdRef.current = '';
      return;
    }

    setMessages([]);
    lastReadMessageIdRef.current = '';
    loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeConversationId]);

  useEffect(() => {
    if (!user || !supabase) {
      setConnectionStatus('offline');
      return () => {};
    }

    const channel = supabase
      .channel(`chat-feed-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          loadConversations({ keepSelection: true });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          loadConversations({ keepSelection: true });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadConversations({ keepSelection: true });
        },
      );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('online');
        loadConversations({ keepSelection: true });
        const conversationId = activeConversationIdRef.current;
        if (conversationId) {
          loadMessages(conversationId, { silent: true, markRead: false });
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setConnectionStatus('offline');
      } else {
        setConnectionStatus('connecting');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations, loadMessages, user]);

  useEffect(() => {
    if (!user || !supabase || !activeConversationId) {
      return () => {};
    }

    const channel = supabase
      .channel(`chat-conversation-${user.id}-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const message = payload.new;
          if (!message?.id) return;

          setMessages((current) => mergeRealtimeMessages(current, [message]));
          if (message.sender_id !== user.id) {
            lastReadMessageIdRef.current = message.id;
            markConversationRead(activeConversationId).catch(() => {});
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, user]);

  useEffect(() => {
    if (!user) return () => {};

    const recoverVisibleState = () => {
      if (document.visibilityState !== 'visible') return;
      loadConversations({ keepSelection: true });
      const conversationId = activeConversationIdRef.current;
      if (conversationId) {
        loadMessages(conversationId, { silent: true, markRead: false });
      }
    };

    window.addEventListener('focus', recoverVisibleState);
    document.addEventListener('visibilitychange', recoverVisibleState);
    return () => {
      window.removeEventListener('focus', recoverVisibleState);
      document.removeEventListener('visibilitychange', recoverVisibleState);
    };
  }, [loadConversations, loadMessages, user]);

  async function handleSend(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    const clientMessageId = `${user?.id || 'user'}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimisticMessage = {
      id: `pending-${clientMessageId}`,
      conversation_id: activeConversationId,
      sender_id: user?.id,
      content,
      client_message_id: clientMessageId,
      is_system: false,
      created_at: new Date().toISOString(),
      sender_profile: null,
      status: 'sending',
    };

    setDraft('');
    setMessages((current) => [...current, optimisticMessage]);

    try {
      setIsSending(true);
      setError('');
      const sentMessage = await sendMessage({
        conversation_id: activeConversationId || undefined,
        receiver_id: receiverId || undefined,
        product_id: productId || undefined,
        content,
        client_message_id: clientMessageId,
      });

      setActiveConversationId(sentMessage.conversation_id);
      setMessages((current) => [
        ...current.filter(
          (message) => message.id !== optimisticMessage.id && message.id !== sentMessage.id,
        ),
        sentMessage,
      ]);
      await loadConversations({ keepSelection: true });
    } catch (err) {
      setError(err.message || 'Không thể gửi tin nhắn.');
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage.id ? { ...message, status: 'failed' } : message,
        ),
      );
      setDraft(content);
    } finally {
      setIsSending(false);
    }
  }

  const peer = getPeer(activeConversation, user?.id);
  const peerName = getPeerName(activeConversation, user?.id);
  const pageTitle = `${headerLabel} | ReMarket`;

  return (
    <MarketplaceLayout container={false} className="px-3 pb-20 pt-4 sm:px-5 md:pb-6">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-7xl flex-col">
        <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/app"
              className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
            >
              <ArrowLeft size={17} />
              Quay lại
            </Link>
            <h1 className="truncate text-2xl font-bold sm:text-3xl">{headerLabel}</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
            {connectionStatus === 'online' ? (
              <Wifi size={15} className="text-success" />
            ) : (
              <WifiOff size={15} className="text-destructive" />
            )}
            {connectionStatus === 'online'
              ? 'Realtime'
              : connectionStatus === 'connecting'
                ? 'Đang kết nối'
                : 'Offline'}
          </div>
        </header>

        {error && (
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 font-semibold transition hover:bg-destructive/15"
              onClick={() => {
                loadConversations({ keepSelection: true });
                if (activeConversationId) loadMessages(activeConversationId);
              }}
            >
              <RefreshCcw size={14} />
              Thử lại
            </button>
          </div>
        )}

        <section className="grid min-h-0 flex-1 overflow-hidden rounded-3xl border border-border bg-card shadow-xl lg:grid-cols-[360px_1fr]">
          <aside className="flex min-h-0 flex-col border-b border-border bg-muted/30 lg:border-b-0 lg:border-r">
            <div className="shrink-0 border-b border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Hội thoại
                </h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  {conversations.length}
                </span>
              </div>
              <label className="flex h-11 items-center gap-2 rounded-2xl border border-input bg-background px-3 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
                <Search size={16} />
                <input
                  value={filterText}
                  onChange={(event) => setFilterText(event.target.value)}
                  placeholder="Tìm theo tên, sản phẩm…"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoadingConversations ? (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 animate-spin" size={18} />
                  Đang tải hội thoại
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Chưa có hội thoại nào.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => {
                    const itemPeer = getPeer(conversation, user?.id);
                    const itemPeerName = getPeerName(conversation, user?.id);
                    const isActive = conversation.id === activeConversationId;
                    const unreadCount = Number(conversation.unread_count) || 0;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setActiveConversationId(conversation.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          isActive
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-transparent hover:border-border hover:bg-background'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-sm font-bold text-secondary-foreground">
                            {itemPeer?.profile?.avatar_url ? (
                              <img
                                src={itemPeer.profile.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(itemPeerName)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-bold">{itemPeerName}</p>
                              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                                {formatConversationTime(conversation.updated_at)}
                              </span>
                            </div>
                            {conversation.product?.title && (
                              <p className="mt-1 truncate text-xs font-semibold text-primary">
                                {conversation.product.title}
                              </p>
                            )}
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                {getPreview(conversation.latest_message)}
                              </p>
                              {unreadCount > 0 && (
                                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
                                  {unreadCount > 9 ? '9+' : unreadCount}
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
            </div>
          </aside>

          <div className="flex min-h-0 flex-col bg-background">
            {!activeConversationId ? (
              <ChatEmptyState
                title="Chọn một cuộc trò chuyện"
                description="Tin nhắn sẽ hiển thị tại đây. Khi bạn nhắn người bán từ trang sản phẩm, hệ thống sẽ tự tạo hội thoại và cập nhật realtime."
              />
            ) : (
              <>
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-sm font-bold text-secondary-foreground">
                      {peer?.profile?.avatar_url ? (
                        <img
                          src={peer.profile.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(peerName)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold">{peerName}</h2>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-success">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        Đang đồng bộ
                      </p>
                    </div>
                  </div>
                  {activeConversation?.product?.id && (
                    <Link
                      to={`/products/${activeConversation.product.id}`}
                      className="hidden max-w-xs truncate rounded-full border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary sm:block"
                    >
                      {activeConversation.product.title}
                    </Link>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  {isLoadingMessages ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Loader2 className="mr-2 animate-spin" size={18} />
                      Đang tải tin nhắn
                    </div>
                  ) : messages.length === 0 ? (
                    <ChatEmptyState
                      title="Bắt đầu cuộc trò chuyện"
                      description="Gửi lời nhắn đầu tiên để trao đổi thêm về sản phẩm, giá bán hoặc cách giao hàng."
                    />
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const isMine = message.sender_id === user?.id;

                        if (message.is_system && message.metadata?.type === 'product_card') {
                          return (
                            <div key={message.id} className="flex justify-center">
                              <ChatProductCard message={message} />
                            </div>
                          );
                        }

                        return (
                          <ChatMessageBubble
                            key={message.id}
                            message={message}
                            mine={isMine}
                            peerName={peerName}
                          />
                        );
                      })}
                      <div ref={endRef} />
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleSend}
                  className="shrink-0 border-t border-border bg-card p-3 sm:p-4"
                >
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground"
                      disabled
                      title="Gửi hình ảnh"
                    >
                      <ImageIcon size={18} />
                    </button>
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSend(event);
                        }
                      }}
                      placeholder="Nhập tin nhắn…"
                      rows={1}
                      className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || isSending}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Gửi tin nhắn"
                    >
                      {isSending ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </MarketplaceLayout>
  );
}

export default ChatPage;
