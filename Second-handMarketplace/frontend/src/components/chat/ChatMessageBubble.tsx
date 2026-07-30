import type { Message } from '@/types/domain';

interface ChatMessageBubbleProps {
  message: Message;
  mine: boolean;
  peerName: string;
}

function ChatMessageBubble({ message, mine, peerName }: ChatMessageBubbleProps) {
  const time = message.created_at
    ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(message.created_at),
      )
    : '';

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <article
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 shadow-sm ${
          mine
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md border border-border bg-card text-card-foreground'
        }`}
      >
        {!mine && (
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            {message.sender_profile?.full_name || peerName}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
        <p
          className={`mt-1 text-right text-[11px] ${
            mine ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}
        >
          {message.status === 'sending'
            ? 'Đang gửi'
            : message.status === 'failed'
              ? 'Gửi lỗi'
              : time}
        </p>
      </article>
    </div>
  );
}

export { ChatMessageBubble };
