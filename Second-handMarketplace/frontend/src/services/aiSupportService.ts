const DEFAULT_BACKEND_URL = 'http://localhost:4000';

export interface AiSupportAnswer {
  answer: string;
  provider?: string;
  sources?: Array<{
    id: string;
    sourceKey: string;
    title: string;
    category?: string;
    score?: number;
    excerpt?: string;
  }>;
  retrieval?: {
    mode: 'hybrid_vector' | 'lexical_fallback';
    model?: string;
    version?: number;
    latencyMs?: number;
    fallbackReason?: string;
  };
  products?: Array<{
    id: string;
    title: string;
    price: number;
    condition?: string;
    location?: string;
    image_url?: string;
    match_mode?: string;
    citation_id?: string;
  }>;
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
