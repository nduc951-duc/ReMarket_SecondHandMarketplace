const aiKnowledgeBase = require('../data/aiKnowledgeBase');

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_MESSAGE_LENGTH = 1200;
const MAX_CONTEXT_ITEMS = 4;

const VIETNAMESE_STOPWORDS = new Set([
  'anh',
  'ban',
  'bi',
  'cai',
  'cho',
  'co',
  'cua',
  'duoc',
  'em',
  'gap',
  'gi',
  'hoi',
  'khong',
  'la',
  'lam',
  'minh',
  'mot',
  'muon',
  'neu',
  'nhu',
  'toi',
  'trong',
  'tu',
  'van',
  've',
  'voi',
]);

function buildServiceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(value = '') {
  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !VIETNAMESE_STOPWORDS.has(token));
}

function scoreKnowledgeItem(questionTokens, item) {
  const haystack = tokenize(`${item.title} ${item.content} ${(item.keywords || []).join(' ')}`);
  const haystackSet = new Set(haystack);
  const keywordSet = new Set((item.keywords || []).flatMap((keyword) => tokenize(keyword)));

  return questionTokens.reduce((score, token) => {
    if (!haystackSet.has(token)) {
      return score;
    }

    return score + (keywordSet.has(token) ? 3 : 1);
  }, 0);
}

function retrieveKnowledge(question, options = {}) {
  const questionTokens = tokenize(question);

  if (questionTokens.length === 0) {
    return [];
  }

  return aiKnowledgeBase
    .map((item) => ({
      ...item,
      score: scoreKnowledgeItem(questionTokens, item),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, options.limit || MAX_CONTEXT_ITEMS);
}

function buildFallbackAnswer(question, contexts) {
  if (!contexts.length) {
    return 'Mình chưa có đủ dữ liệu để trả lời chắc chắn câu này. Bạn nên liên hệ nhân viên hỗ trợ để được kiểm tra kỹ hơn.';
  }

  const summary = contexts
    .map((item) => `- ${item.title}: ${item.content}`)
    .join('\n');

  return [
    'Mình tìm được một số thông tin liên quan trong phần hỗ trợ của ReMarket:',
    summary,
    '',
    'Nếu trường hợp của bạn có tranh chấp, thanh toán bất thường hoặc cần kiểm tra riêng, bạn nên liên hệ nhân viên hỗ trợ để được xử lý chắc chắn hơn.',
  ].join('\n');
}

function buildPrompt({ message, contexts }) {
  const contextText = contexts
    .map((item, index) => `[${index + 1}] ${item.title}\n${item.content}`)
    .join('\n\n');

  return [
    'Du lieu noi bo cua ReMarket:',
    contextText || 'Khong co du lieu lien quan.',
    '',
    `Cau hoi cua nguoi dung: ${message}`,
  ].join('\n');
}

function buildSystemInstruction() {
  return 'Ban la tro ly tu van AI cua ReMarket. Luon tra loi bang tieng Viet. Chi dua tren du lieu noi bo duoc cung cap. Khong xu ly du lieu ca nhan, khong noi rang ban co the xem don hang rieng. Neu du lieu khong du, hay noi chua du thong tin va de xuat lien he nhan vien ho tro.';
}

function getAvailableProviders() {
  return [
    {
      id: 'groq',
      apiKey: process.env.GROQ_API_KEY || '',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      call: callGroq,
    },
    {
      id: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      call: callGemini,
    },
    {
      id: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-5.4-nano',
      call: callOpenAI,
    },
  ];
}

function selectProvider() {
  const requestedProvider = String(process.env.AI_PROVIDER || '').trim().toLowerCase();
  const providers = getAvailableProviders();

  if (requestedProvider) {
    return providers.find((provider) => provider.id === requestedProvider && provider.apiKey) || null;
  }

  return providers.find((provider) => provider.apiKey) || null;
}

async function callOpenAI({ message, contexts, provider }) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      instructions: buildSystemInstruction(),
      input: buildPrompt({ message, contexts }),
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw buildServiceError(result.error?.message || 'OpenAI API khong phan hoi thanh cong.', 502);
  }

  const answer =
    result.output_text ||
    result.output
      ?.flatMap((item) => item.content || [])
      ?.map((content) => content.text)
      ?.filter(Boolean)
      ?.join('\n')
      ?.trim();

  if (!answer) {
    throw buildServiceError('OpenAI API khong tra ve noi dung hop le.', 502);
  }

  return answer;
}

async function callGroq({ message, contexts, provider }) {
  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        {
          role: 'system',
          content: buildSystemInstruction(),
        },
        {
          role: 'user',
          content: buildPrompt({ message, contexts }),
        },
      ],
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw buildServiceError(result.error?.message || 'Groq API khong phan hoi thanh cong.', 502);
  }

  const answer = String(result.choices?.[0]?.message?.content || '').trim();

  if (!answer) {
    throw buildServiceError('Groq API khong tra ve noi dung hop le.', 502);
  }

  return answer;
}

async function callGemini({ message, contexts, provider }) {
  const response = await fetch(
    `${GEMINI_API_BASE_URL}/${encodeURIComponent(provider.model)}:generateContent?key=${provider.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemInstruction() }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt({ message, contexts }) }],
          },
        ],
      }),
    },
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw buildServiceError(result.error?.message || 'Gemini API khong phan hoi thanh cong.', 502);
  }

  const answer = (result.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!answer) {
    throw buildServiceError('Gemini API khong tra ve noi dung hop le.', 502);
  }

  return answer;
}

async function answerAiSupportQuestion({ message }) {
  const cleanMessage = String(message || '').trim();

  if (!cleanMessage) {
    throw buildServiceError('Vui long nhap cau hoi can tu van.', 400);
  }

  if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
    throw buildServiceError(`Cau hoi toi da ${MAX_MESSAGE_LENGTH} ky tu.`, 400);
  }

  const contexts = retrieveKnowledge(cleanMessage);
  const provider = selectProvider();

  if (!provider) {
    return {
      answer: buildFallbackAnswer(cleanMessage, contexts),
      mode: 'retrieval_fallback',
      matched: contexts.map(({ id, title, category, score }) => ({ id, title, category, score })),
    };
  }

  try {
    const answer = await provider.call({ message: cleanMessage, contexts, provider });

    return {
      answer,
      mode: `${provider.id}_rag`,
      provider: provider.id,
      model: provider.model,
      matched: contexts.map(({ id, title, category, score }) => ({ id, title, category, score })),
    };
  } catch (error) {
    return {
      answer: buildFallbackAnswer(cleanMessage, contexts),
      mode: `${provider.id}_error_fallback`,
      provider: provider.id,
      model: provider.model,
      warning:
        'AI provider hien chua san sang. He thong da tra loi bang du lieu FAQ/chinh sach noi bo.',
      matched: contexts.map(({ id, title, category, score }) => ({ id, title, category, score })),
    };
  }
}

module.exports = {
  answerAiSupportQuestion,
  buildFallbackAnswer,
  retrieveKnowledge,
  selectProvider,
  tokenize,
};
