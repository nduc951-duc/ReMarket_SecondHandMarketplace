import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  MessageSquare,
  Package,
  RefreshCcw,
  Search,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  ensureConversation,
  getConversationMessages,
  getConversations,
  markConversationRead,
  sendMessage,
} from '../../services/chatService';
import { useAuthStore } from '../../store/authStore';

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

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
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
  return peer?.profile?.full_name || 'Nguoi dung';
}

function getPreview(message) {
  if (!message) return 'Chua co tin nhan';
  if (message.is_system && message.metadata?.type === 'product_card') {
    return message.metadata?.product?.title || 'Dang hoi ve san pham';
  }

  return message.content || 'Tin nhan moi';
}

function ProductMessage({ message }) {
  const product = message?.metadata?.product || {};

  return (
    <div className="max-w-sm rounded-2xl border border-teal-400/20 bg-teal-400/10 p-3 text-left shadow-lg shadow-teal-950/20">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
        {message?.metadata?.label || 'San pham'}
      </p>
      <Link
        to={product.url || `/products/${product.id}`}
        className="flex gap-3 rounded-xl text-slate-100 transition hover:bg-white/5"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-950">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title || 'San pham'} className="h-full w-full object-cover" />
          ) : (
            <Package size={22} className="text-slate-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
            {product.title || 'San pham'}
          </p>
          <p className="mt-1 text-sm font-bold text-teal-300">{formatCurrency(product.price)}</p>
        </div>
      </Link>
      <p className="mt-3 text-xs text-slate-500">{formatTime(message.created_at)}</p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-teal-300">
        <MessageSquare size={26} />
      </div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function ChatPage({ defaultReceiverId = '', disableProductCard = false, headerLabel = 'Tin nhan' }) {
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
      return peerName.includes(keyword) || productTitle.includes(keyword) || preview.includes(keyword);
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
        keepSelection
        && activeConversationIdRef.current
        && !nextConversations.some((item) => item.id === activeConversationIdRef.current)
        && nextConversations[0]
      ) {
        setActiveConversationId(nextConversations[0].id);
      }
    } catch (err) {
      setError(err.message || 'Khong the tai danh sach chat.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId, { silent = false, markRead = true } = {}) => {
    if (!conversationId) return;

    try {
      if (!silent) setIsLoadingMessages(true);
      setError('');
      const data = await getConversationMessages(conversationId, {
        limit: MESSAGE_LIMIT,
        markRead,
      });
      const nextMessages = data?.messages || [];
      setConversationDetail(data?.conversation || null);
      setMessages(nextMessages);

      const latestMessage = nextMessages[nextMessages.length - 1];
      if (markRead && latestMessage?.id && lastReadMessageIdRef.current !== latestMessage.id) {
        lastReadMessageIdRef.current = latestMessage.id;
        await markConversationRead(conversationId).catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Khong the tai tin nhan.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

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
              sessionStorage.setItem(ensureCacheKey, JSON.stringify({
                conversationId: nextConversationId,
                savedAt: Date.now(),
              }));
            } catch {
              // Cache is optional.
            }
          }
          setActiveConversationId(nextConversationId);
          await loadConversations({ keepSelection: true });
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Khong the tao cuoc tro chuyen.');
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
      .channel(`chat-page-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const conversationId = payload.new?.conversation_id;
          loadConversations({ keepSelection: true });

          if (conversationId && conversationId === activeConversationIdRef.current) {
            loadMessages(conversationId, { silent: true, markRead: true });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          loadConversations({ keepSelection: true });
        },
      );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('online');
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
    if (!user) {
      return () => {};
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      loadConversations({ keepSelection: true });
      const currentConversationId = activeConversationIdRef.current;
      if (currentConversationId) {
        loadMessages(currentConversationId, { silent: true, markRead: false });
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
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
        ...current.filter((message) => message.id !== optimisticMessage.id && message.id !== sentMessage.id),
        sentMessage,
      ]);
      await loadConversations({ keepSelection: true });
    } catch (err) {
      setError(err.message || 'Khong the gui tin nhan.');
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage.id
            ? { ...message, status: 'failed' }
            : message,
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
    <main className="min-h-screen bg-transparent text-slate-200">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div className="mx-auto flex h-screen max-h-screen w-full max-w-7xl flex-col px-3 py-4 sm:px-5 sm:py-6">
        <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link to="/app" className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-teal-300">
              <ArrowLeft size={17} />
              Quay lai
            </Link>
            <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{headerLabel}</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
            {connectionStatus === 'online' ? (
              <Wifi size={15} className="text-teal-300" />
            ) : (
              <WifiOff size={15} className="text-rose-300" />
            )}
            {connectionStatus === 'online' ? 'Realtime' : connectionStatus === 'connecting' ? 'Dang ket noi' : 'Offline'}
          </div>
        </header>

        {error && (
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <span>{error}</span>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white transition hover:bg-white/15"
              onClick={() => {
                loadConversations({ keepSelection: true });
                if (activeConversationId) loadMessages(activeConversationId);
              }}
            >
              <RefreshCcw size={14} />
              Thu lai
            </button>
          </div>
        )}

        <section className="grid min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-[#0d1324]/95 shadow-2xl shadow-slate-950/40 lg:grid-cols-[360px_1fr]">
          <aside className="flex min-h-0 flex-col border-b border-white/10 bg-[#0a0f1e]/90 lg:border-b-0 lg:border-r">
            <div className="shrink-0 border-b border-white/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Hoi thoai</h2>
                <span className="rounded-full bg-teal-400/10 px-2.5 py-1 text-xs font-bold text-teal-300">
                  {conversations.length}
                </span>
              </div>
              <label className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-slate-400 focus-within:border-teal-400/70">
                <Search size={16} />
                <input
                  value={filterText}
                  onChange={(event) => setFilterText(event.target.value)}
                  placeholder="Tim theo ten, san pham..."
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoadingConversations ? (
                <div className="flex h-48 items-center justify-center text-slate-500">
                  <Loader2 className="mr-2 animate-spin" size={18} />
                  Dang tai chat
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-slate-500">
                  Chua co hoi thoai nao.
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
                            ? 'border-teal-400/50 bg-teal-400/10 shadow-lg shadow-teal-950/20'
                            : 'border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-800 text-sm font-bold text-teal-200">
                            {itemPeer?.profile?.avatar_url ? (
                              <img src={itemPeer.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              getInitials(itemPeerName)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-bold text-white">{itemPeerName}</p>
                              <span className="shrink-0 text-[11px] font-medium text-slate-500">
                                {formatConversationTime(conversation.updated_at)}
                              </span>
                            </div>
                            {conversation.product?.title && (
                              <p className="mt-1 truncate text-xs font-semibold text-teal-300">
                                {conversation.product.title}
                              </p>
                            )}
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
                                {getPreview(conversation.latest_message)}
                              </p>
                              {unreadCount > 0 && (
                                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
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

          <div className="flex min-h-0 flex-col bg-[#111827]">
            {!activeConversationId ? (
              <EmptyState
                title="Chon mot cuoc tro chuyen"
                description="Tin nhan se hien thi tai day. Khi ban nhan tin nguoi ban tu trang san pham, he thong se tu tao hoi thoai va cap nhat realtime."
              />
            ) : (
              <>
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0d1324] px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-800 text-sm font-bold text-teal-200">
                      {peer?.profile?.avatar_url ? (
                        <img src={peer.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        getInitials(peerName)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-white">{peerName}</h2>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-teal-300">
                        <span className="h-2 w-2 rounded-full bg-teal-300" />
                        Dang dong bo
                      </p>
                    </div>
                  </div>
                  {activeConversation?.product?.id && (
                    <Link
                      to={`/products/${activeConversation.product.id}`}
                      className="hidden max-w-xs truncate rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-teal-400/40 hover:text-teal-200 sm:block"
                    >
                      {activeConversation.product.title}
                    </Link>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  {isLoadingMessages ? (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      <Loader2 className="mr-2 animate-spin" size={18} />
                      Dang tai tin nhan
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyState
                      title="Bat dau cuoc tro chuyen"
                      description="Gui loi nhan dau tien de trao doi them ve san pham, gia ban hoac cach giao hang."
                    />
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const isMine = message.sender_id === user?.id;

                        if (message.is_system && message.metadata?.type === 'product_card') {
                          return (
                            <div key={message.id} className="flex justify-center">
                              <ProductMessage message={message} />
                            </div>
                          );
                        }

                        return (
                          <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-lg ${
                              isMine
                                ? 'rounded-br-md bg-gradient-to-br from-teal-400 to-cyan-400 text-slate-950 shadow-teal-950/20'
                                : 'rounded-bl-md border border-white/10 bg-white/5 text-slate-100 shadow-slate-950/20'
                            }`}
                            >
                              {!isMine && (
                                <p className="mb-1 text-xs font-semibold text-slate-400">
                                  {message.sender_profile?.full_name || peerName}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
                              <div className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] ${
                                isMine ? 'text-slate-800/70' : 'text-slate-500'
                              }`}
                              >
                                <span>{message.status === 'sending' ? 'Dang gui' : message.status === 'failed' ? 'Loi' : formatTime(message.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={endRef} />
                    </div>
                  )}
                </div>

                <form onSubmit={handleSend} className="shrink-0 border-t border-white/10 bg-[#0d1324] p-3 sm:p-4">
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 transition hover:text-teal-300"
                      disabled
                      title="Gui hinh anh"
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
                      placeholder="Nhap tin nhan..."
                      rows={1}
                      className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-5 text-white outline-none placeholder:text-slate-600 focus:border-teal-400/70"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || isSending}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-400 text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                      title="Gui tin nhan"
                    >
                      {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default ChatPage;
