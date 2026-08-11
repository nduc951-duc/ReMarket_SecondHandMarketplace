import { apiRequest } from '@/services/apiClient';

export interface AiSupportAnswer {
  answer: string;
  provider?: string;
  intent?: 'KNOWLEDGE' | 'PRODUCT_SEARCH' | 'TRANSACTION' | 'OUT_OF_SCOPE';
  confidence?: 'high' | 'medium' | 'low';
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
    confidence?: 'high' | 'medium' | 'low';
    bestScore?: number;
    threshold?: number;
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
  const result = await apiRequest<AiSupportAnswer>('/api/ai-support/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
    fallbackMessage: 'Không thể kết nối trợ lý AI.',
  });
  return result || { answer: 'Trợ lý chưa có câu trả lời.' };
}
