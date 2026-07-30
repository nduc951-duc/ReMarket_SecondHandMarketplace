const DEFAULT_BACKEND_URL = 'http://localhost:4000';

export interface AiSupportAnswer {
  answer: string;
  provider?: string;
  sources?: string[];
}

export async function askAiSupport(message: string): Promise<AiSupportAnswer> {
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL}/api/ai-support/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    },
  );
  const result = (await response.json().catch(() => ({}))) as {
    data?: AiSupportAnswer;
    message?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(result.error?.message || result.message || 'Không thể kết nối trợ lý AI.');
  }
  return result.data || { answer: 'Trợ lý chưa có câu trả lời.' };
}
