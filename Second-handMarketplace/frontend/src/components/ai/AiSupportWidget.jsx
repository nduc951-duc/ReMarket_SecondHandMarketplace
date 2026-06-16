import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { useState } from 'react';
import { askAiSupport } from '../../services/aiSupportService';

const initialMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Chao ban, minh la tro ly AI cua ReMarket. Minh co the giai thich chinh sach mua ban, hoan tien, thanh toan, tai khoan va cac cau hoi thuong gap.',
  },
];

function createMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  };
}

function AiSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    const message = draft.trim();
    if (!message || isSending) {
      return;
    }

    setDraft('');
    setErrorMessage('');
    setIsSending(true);
    setMessages((previous) => [...previous, createMessage('user', message)]);

    try {
      const result = await askAiSupport(message);
      setMessages((previous) => [
        ...previous,
        createMessage('assistant', result.answer || 'Minh chua co cau tra loi phu hop.'),
      ]);
    } catch (error) {
      setErrorMessage(error.message || 'Khong the ket noi tro ly AI.');
      setMessages((previous) => [
        ...previous,
        createMessage(
          'assistant',
          'Minh dang gap loi ket noi. Ban co the lien he nhan vien ho tro de duoc xu ly nhanh hon.',
        ),
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="ai-support-widget">
      {isOpen && (
        <section className="ai-support-panel" aria-label="Tro ly AI ReMarket">
          <header className="ai-support-header">
            <div className="ai-support-title">
              <span className="ai-support-icon">
                <Bot size={18} aria-hidden="true" />
              </span>
              <div>
                <h2>Tu van AI</h2>
                <p>FAQ va chinh sach ReMarket</p>
              </div>
            </div>
            <button
              type="button"
              className="ai-support-close"
              onClick={() => setIsOpen(false)}
              aria-label="Dong tro ly AI"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="ai-support-messages" aria-live="polite">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`ai-support-message ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                <p>{message.content}</p>
              </article>
            ))}
            {isSending && (
              <article className="ai-support-message assistant">
                <p>Dang tim thong tin lien quan...</p>
              </article>
            )}
          </div>

          <form className="ai-support-form" onSubmit={handleSubmit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nhap cau hoi ve mua ban, hoan tien, thanh toan..."
              rows={2}
              maxLength={1200}
            />
            <button type="submit" disabled={!draft.trim() || isSending} aria-label="Gui cau hoi">
              <Send size={18} aria-hidden="true" />
            </button>
          </form>

          {errorMessage && <p className="ai-support-error">{errorMessage}</p>}
        </section>
      )}

      <button
        type="button"
        className="ai-support-fab"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? 'Dong tro ly AI' : 'Mo tro ly AI'}
      >
        {isOpen ? <X size={24} aria-hidden="true" /> : <MessageCircle size={24} aria-hidden="true" />}
      </button>
    </div>
  );
}

export default AiSupportWidget;
