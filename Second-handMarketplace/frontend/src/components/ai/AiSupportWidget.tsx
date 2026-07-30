import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button, Card, Textarea } from '@/components/ui';
import { askAiSupport } from '@/services/aiSupportService';

interface SupportMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const initialMessages: SupportMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Chào bạn, mình là trợ lý AI của ReMarket. Mình có thể giải thích chính sách mua bán, hoàn tiền, thanh toán và tài khoản.',
  },
];

function createMessage(role: SupportMessage['role'], content: string): SupportMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  };
}

function AiSupportWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setDraft('');
    setError('');
    setSending(true);
    setMessages((current) => [...current, createMessage('user', content)]);
    try {
      const result = await askAiSupport(content);
      setMessages((current) => [
        ...current,
        createMessage('assistant', result.answer || 'Mình chưa có câu trả lời phù hợp.'),
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể kết nối trợ lý AI.');
      setMessages((current) => [
        ...current,
        createMessage(
          'assistant',
          'Mình đang gặp lỗi kết nối. Bạn có thể mở trang hỗ trợ để trao đổi với nhân viên.',
        ),
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6">
      {open && (
        <Card
          className="mb-3 flex h-[min(580px,calc(100vh-8rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden shadow-2xl"
          aria-label="Trợ lý AI ReMarket"
        >
          <header className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-primary-foreground/15">
                <Bot className="size-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Tư vấn AI</h2>
                <p className="text-xs text-primary-foreground/75">FAQ và chính sách ReMarket</p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Đóng trợ lý AI"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </header>

          <div
            className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4"
            aria-live="polite"
          >
            {messages.map((message) => (
              <article
                key={message.id}
                className={`w-fit max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                  message.role === 'user'
                    ? 'ml-auto rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md border border-border bg-card'
                }`}
              >
                {message.content}
              </article>
            ))}
            {sending && (
              <article className="flex w-fit items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Đang tìm thông tin…
              </article>
            )}
          </div>

          <form className="border-t border-border bg-card p-3" onSubmit={submit}>
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Hỏi về mua bán, hoàn tiền, thanh toán…"
                rows={2}
                maxLength={1200}
                className="min-h-12 resize-none"
              />
              <Button
                type="submit"
                size="icon"
                className="shrink-0"
                disabled={!draft.trim() || sending}
                aria-label="Gửi câu hỏi"
              >
                <Send className="size-4" />
              </Button>
            </div>
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </form>
        </Card>
      )}

      <Button
        size="icon"
        className="ml-auto size-13 rounded-full shadow-lg"
        aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </div>
  );
}

export default AiSupportWidget;
