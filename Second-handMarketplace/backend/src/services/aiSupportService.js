const aiKnowledgeBase = require('../data/aiKnowledgeBase');
const { getProducts, scoreProductMatch } = require('../models/products/productModel');
const { retrieveHybridRag } = require('./vectorRagService');
const { INTENTS, routeIntent } = require('../rag/retrieval/intentRouter');
const { locationMatches, parseProductQuery } = require('../rag/retrieval/queryParser');
const { rerankCandidates } = require('../rag/retrieval/reranker');
const { assessRetrievalConfidence } = require('../rag/retrieval/confidence');
const { validateCitations } = require('../rag/generation/citationValidator');

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
    .replace(/đ/g, 'd')
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

function buildFallbackAnswer(question, contexts, products = []) {
  if (products.length) {
    const recommendations = products
      .map(
        (product, index) =>
          `${index + 1}. ${product.title} — ${Number(product.price).toLocaleString('vi-VN')}đ — /products/${product.id} [${product.citation_id || `P${index + 1}`}]`,
      )
      .join('\n');
    return [
      'Mình tìm thấy các sản phẩm đang còn bán phù hợp hoặc gần với nhu cầu của bạn:',
      recommendations,
      '',
      'Bạn nên mở từng sản phẩm để kiểm tra tình trạng, vị trí và trao đổi thêm với người bán.',
    ].join('\n');
  }

  if (!contexts.length) {
    return 'Mình chưa có đủ dữ liệu để trả lời chắc chắn câu này. Bạn nên liên hệ nhân viên hỗ trợ để được kiểm tra kỹ hơn.';
  }

  const summary = contexts
    .map(
      (item, index) => `- ${item.title}: ${item.content} [${item.citationId || `D${index + 1}`}]`,
    )
    .join('\n');

  return [
    'Mình tìm được một số thông tin liên quan trong phần hỗ trợ của ReMarket:',
    summary,
    '',
    'Nếu trường hợp của bạn có tranh chấp, thanh toán bất thường hoặc cần kiểm tra riêng, bạn nên liên hệ nhân viên hỗ trợ để được xử lý chắc chắn hơn.',
  ].join('\n');
}

function buildPrompt({ message, contexts, products = [] }) {
  const contextText = contexts
    .map((item, index) => `[${item.citationId || `D${index + 1}`}] ${item.title}\n${item.content}`)
    .join('\n\n');

  const productText = products.length
    ? products
        .map(
          (product, index) =>
            `[${product.citation_id || `P${index + 1}`}] ${product.title}; giá ${Number(product.price).toLocaleString('vi-VN')} VND; tình trạng ${product.condition || 'chưa rõ'}; vị trí ${product.location || 'chưa rõ'}; link /products/${product.id}`,
        )
        .join('\n')
    : 'Không tìm thấy sản phẩm đang bán phù hợp.';

  return [
    'Du lieu noi bo cua ReMarket:',
    contextText || 'Khong co du lieu lien quan.',
    '',
    'San pham dang con ban (ket qua chinh xac hoac gan dung):',
    productText,
    '',
    `Cau hoi cua nguoi dung: ${message}`,
  ].join('\n');
}

function buildSystemInstruction() {
  return 'Ban la tro ly mua sam do cu cua ReMarket. Luon tra loi bang tieng Viet, ngan gon va thuc te. Chi dua tren nguon [D#] va san pham [P#] duoc cung cap; trich dan id nguon trong ngoac vuong khi dua ra thong tin. Khong tu bia san pham, link, gia hay tinh trang. Khi co san pham, de xuat toi da 5 lua chon trong danh sach kem ly do va link /products/<id>. Ket qua gan dung phai noi ro la gan dung. Khong xu ly du lieu ca nhan va khong noi rang ban co the xem don hang rieng.';
}

function buildLocalSources(contexts) {
  return contexts.map((context, index) => ({
    id: context.citationId || `D${index + 1}`,
    sourceKey: context.id,
    title: context.title,
    category: context.category,
    score: Number(context.score || 0),
    excerpt: String(context.content || '').slice(0, 180),
  }));
}

function mergeProductRecommendations(vectorProducts = [], lexicalProducts = [], limit = 5) {
  const exact = lexicalProducts.filter((product) => product.match_mode !== 'fuzzy');
  const fuzzy = lexicalProducts.filter((product) => product.match_mode === 'fuzzy');
  const merged = [];
  const seen = new Set();

  [...exact, ...vectorProducts, ...fuzzy].forEach((product) => {
    if (!product?.id || seen.has(product.id) || merged.length >= limit) return;
    seen.add(product.id);
    merged.push({ ...product, citation_id: `P${merged.length + 1}` });
  });
  return merged;
}

function sanitizeGroundedAnswer(answer, products = [], sources = []) {
  const productIds = new Set(products.map((product) => String(product.id)));
  const productCitationIds = new Set(products.map((product) => String(product.citation_id)));
  const sourceIds = new Set(sources.map((source) => String(source.id)));

  return String(answer || '')
    .replace(/\/products\/([a-zA-Z0-9-]+)/g, (link, productId) =>
      productIds.has(productId) ? link : '[liên kết sản phẩm không hợp lệ]',
    )
    .replace(/\[(D\d+)\]/g, (citation, sourceId) => (sourceIds.has(sourceId) ? citation : ''))
    .replace(/\[(P\d+)\]/g, (citation, sourceId) =>
      productCitationIds.has(sourceId) ? citation : '',
    )
    .trim();
}

function buildNoProductMatchAnswer(message) {
  const maxPrice = parseBudget(message);
  const budgetText = maxPrice ? ` trong ngân sách tối đa ${maxPrice.toLocaleString('vi-VN')}đ` : '';

  return [
    `Hiện ReMarket chưa có sản phẩm đang bán đủ gần với nhu cầu của bạn${budgetText}.`,
    'Bạn có thể thử từ khóa ngắn hơn, tăng ngân sách hoặc quay lại sau khi có tin đăng mới.',
    'Mình sẽ không đề xuất sản phẩm khác loại chỉ để lấp kết quả.',
  ].join(' ');
}

function amountFromMatch(value, unit) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return undefined;
  return ['trieu', 'tr'].includes(unit) ? amount * 1_000_000 : amount * 1_000;
}

function parsePriceFilters(message) {
  const normalized = normalizeText(message).replace(/,/g, '.');
  const range = normalized.match(
    /(?:tu\s+)?(\d+(?:\.\d+)?)\s*(trieu|tr|nghin|ngan|k)?\s*(?:den|-)\s*(\d+(?:\.\d+)?)\s*(trieu|tr|nghin|ngan|k)\b/,
  );
  if (range) {
    const sharedUnit = range[4] || range[2];
    return {
      minPrice: amountFromMatch(range[1], range[2] || sharedUnit),
      maxPrice: amountFromMatch(range[3], sharedUnit),
    };
  }

  const minimum = normalized.match(
    /(?:tren|hon|toi thieu|tu)\s*(\d+(?:\.\d+)?)\s*(trieu|tr|nghin|ngan|k)\b/,
  );
  const maximum = normalized.match(
    /(?:duoi|toi da|khong qua|tam|khoang|ngan sach)\s*(\d+(?:\.\d+)?)\s*(trieu|tr|nghin|ngan|k)\b/,
  );
  const generic = normalized.match(/(\d+(?:\.\d+)?)\s*(trieu|tr|nghin|ngan|k)\b/);

  return {
    minPrice: minimum ? amountFromMatch(minimum[1], minimum[2]) : undefined,
    maxPrice: maximum
      ? amountFromMatch(maximum[1], maximum[2])
      : minimum
        ? undefined
        : generic
          ? amountFromMatch(generic[1], generic[2])
          : undefined,
  };
}

function parseBudget(message) {
  return parsePriceFilters(message).maxPrice;
}

function looksLikeProductRequest(message) {
  const normalized = normalizeText(message);
  return /(tim|mua|san pham|goi y|tu van|camera|dien thoai|may tinh bang|laptop|tui|giay|quan ao|do gia dung|do cu|thiet bi|chup anh|xe)/.test(
    normalized,
  );
}

function extractProductSearchQuery(message) {
  const ignored = new Set([
    'tim',
    'mua',
    'san',
    'pham',
    'goi',
    'y',
    'tu',
    'van',
    'duoi',
    'toi',
    'da',
    'khong',
    'qua',
    'tam',
    'khoang',
    'tren',
    'hon',
    'den',
    'thieu',
    'ngan',
    'sach',
    'trieu',
    'nghin',
  ]);
  return normalizeText(message)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token && !ignored.has(token) && !/^\d+(?:\.\d+)?$/.test(token))
    .join(' ')
    .trim();
}

async function retrieveProductRecommendations(message, options = {}) {
  if (!looksLikeProductRequest(message)) return [];
  const parsedQuery = parseProductQuery(message);
  const { category, condition, location, minPrice, maxPrice, semanticQuery } = parsedQuery;
  const prefersLowPrice = /\b(gia re|re nhat|tiet kiem)\b/.test(normalizeText(message));

  try {
    const search = semanticQuery || extractProductSearchQuery(message) || message;
    const result = await getProducts({
      search,
      category,
      condition,
      min_price: minPrice,
      max_price: maxPrice,
      limit: options.limit || 5,
      sort: prefersLowPrice ? 'price_asc' : 'relevance',
    });
    const matchMode = result.pagination?.matchMode || 'exact';
    return (result.products || [])
      .filter((product) => minPrice === undefined || Number(product.price) >= minPrice)
      .filter((product) => maxPrice === undefined || Number(product.price) <= maxPrice)
      .filter((product) => !category || product.category === category)
      .filter((product) => !condition || product.condition === condition)
      .filter((product) => locationMatches(product.location, location))
      .map((product) => ({
        ...product,
        relevance_score: scoreProductMatch(search, product),
      }))
      .filter((product) => product.relevance_score >= 0.65)
      .sort((left, right) => {
        if (prefersLowPrice) return Number(left.price) - Number(right.price);
        return right.relevance_score - left.relevance_score;
      })
      .slice(0, options.limit || 5)
      .map((product) => ({
        id: product.id,
        title: product.title,
        price: Number(product.price),
        condition: product.condition,
        location: product.location,
        image_url: product.image_url || product.images?.[0] || '',
        match_mode: matchMode,
      }));
  } catch {
    return [];
  }
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
  const requestedProvider = String(process.env.AI_PROVIDER || '')
    .trim()
    .toLowerCase();
  const providers = getAvailableProviders();

  if (requestedProvider) {
    return (
      providers.find((provider) => provider.id === requestedProvider && provider.apiKey) || null
    );
  }

  return providers.find((provider) => provider.apiKey) || null;
}

async function callOpenAI({ message, contexts, products, provider }) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      instructions: buildSystemInstruction(),
      input: buildPrompt({ message, contexts, products }),
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

  return {
    answer,
    usage: {
      inputTokens: Number(result.usage?.input_tokens || 0),
      outputTokens: Number(result.usage?.output_tokens || 0),
    },
  };
}

async function callGroq({ message, contexts, products, provider }) {
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
          content: buildPrompt({ message, contexts, products }),
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

  return {
    answer,
    usage: {
      inputTokens: Number(result.usage?.prompt_tokens || 0),
      outputTokens: Number(result.usage?.completion_tokens || 0),
    },
  };
}

async function callGemini({ message, contexts, products, provider }) {
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
            parts: [{ text: buildPrompt({ message, contexts, products }) }],
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

  return {
    answer,
    usage: {
      inputTokens: Number(result.usageMetadata?.promptTokenCount || 0),
      outputTokens: Number(result.usageMetadata?.candidatesTokenCount || 0),
    },
  };
}

async function retrieveAdvisorContext(cleanMessage, options = {}) {
  const routed = routeIntent(cleanMessage);
  const parsedQuery = parseProductQuery(cleanMessage);
  const productRequest = routed.intent === INTENTS.PRODUCT_SEARCH;
  if ([INTENTS.OUT_OF_SCOPE, INTENTS.TRANSACTION].includes(routed.intent)) {
    return {
      contexts: [],
      intent: routed.intent,
      intentConfidence: routed.confidence,
      parsedQuery,
      productRequest: false,
      products: [],
      sources: [],
      confidence: 'low',
      shouldAnswer: false,
      retrieval: {
        mode: 'skipped',
        confidence: 'low',
        bestScore: 0,
        threshold: Number(options.threshold ?? process.env.RAG_MIN_RETRIEVAL_SCORE ?? 0.12),
        queries: { knowledge: routed.normalized, product: null },
      },
    };
  }
  const lexicalContexts =
    routed.intent === INTENTS.OUT_OF_SCOPE
      ? []
      : rerankCandidates(routed.normalized, retrieveKnowledge(cleanMessage, { limit: 18 }), {
          enabled: options.rerankEnabled ?? true,
        });
  const [vectorResult, lexicalProducts] = await Promise.all([
    retrieveHybridRag({
      message: cleanMessage,
      knowledgeQuery: routed.normalized,
      productRequest,
      productSearch: parsedQuery.semanticQuery,
      minPrice: parsedQuery.minPrice,
      maxPrice: parsedQuery.maxPrice,
      categories: parsedQuery.category ? [parsedQuery.category] : undefined,
      conditions: parsedQuery.condition ? [parsedQuery.condition] : undefined,
      location: parsedQuery.location,
    }),
    productRequest ? retrieveProductRecommendations(cleanMessage) : Promise.resolve([]),
  ]);
  const contexts =
    vectorResult.available && vectorResult.contexts.length
      ? vectorResult.contexts
      : lexicalContexts.map((context, index) => ({
          ...context,
          citationId: `D${index + 1}`,
        }));
  const products = mergeProductRecommendations(vectorResult.products, lexicalProducts);
  const sources =
    vectorResult.available && vectorResult.contexts.length
      ? vectorResult.sources
      : buildLocalSources(contexts);
  const retrieval = {
    mode: vectorResult.available ? 'hybrid_vector' : 'lexical_fallback',
    model: vectorResult.model,
    version: vectorResult.version,
    latencyMs: vectorResult.latencyMs,
    fallbackReason: vectorResult.reason || undefined,
    queries: vectorResult.queries || {
      knowledge: routed.normalized,
      product: productRequest ? parsedQuery.semanticQuery : null,
    },
  };
  const confidenceResult = assessRetrievalConfidence(productRequest ? products : contexts, {
    threshold: options.threshold,
  });

  return {
    contexts: productRequest ? contexts : confidenceResult.accepted,
    intent: routed.intent,
    intentConfidence: routed.confidence,
    parsedQuery,
    productRequest,
    products: productRequest ? confidenceResult.accepted : products,
    sources,
    confidence: confidenceResult.confidence,
    shouldAnswer: confidenceResult.shouldAnswer,
    retrieval: {
      ...retrieval,
      confidence: confidenceResult.confidence,
      bestScore: confidenceResult.bestScore,
      threshold: confidenceResult.threshold,
    },
  };
}

async function answerAiSupportQuestion({ message }, options = {}) {
  const cleanMessage = String(message || '').trim();

  if (!cleanMessage) {
    throw buildServiceError('Vui long nhap cau hoi can tu van.', 400);
  }

  if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
    throw buildServiceError(`Cau hoi toi da ${MAX_MESSAGE_LENGTH} ky tu.`, 400);
  }

  const {
    confidence,
    contexts,
    intent,
    parsedQuery,
    productRequest,
    products,
    shouldAnswer,
    sources,
    retrieval,
  } = await (options.retrieveContext || retrieveAdvisorContext)(cleanMessage);

  if (intent === INTENTS.OUT_OF_SCOPE) {
    return {
      answer:
        'Mình chỉ hỗ trợ chính sách, giao dịch và tìm sản phẩm trên ReMarket. Bạn có thể hỏi về mua bán đồ cũ, thanh toán hoặc đổi trả.',
      mode: 'out_of_scope',
      intent,
      confidence: 'low',
      products: [],
      sources: [],
      retrieval,
    };
  }

  if (intent === INTENTS.TRANSACTION) {
    return {
      answer:
        'Mình không truy cập dữ liệu đơn hàng riêng trong cuộc trò chuyện này. Bạn hãy mở mục Giao dịch để xem trạng thái; nếu thanh toán hoặc trạng thái bất thường, hãy liên hệ hỗ trợ và cung cấp mã đơn trong kênh bảo mật.',
      mode: 'transaction_safe_handoff',
      intent,
      confidence,
      products: [],
      sources,
      retrieval,
    };
  }

  if (productRequest && products.length === 0) {
    return {
      answer: buildNoProductMatchAnswer(cleanMessage),
      mode: 'product_search_no_match',
      products: [],
      sources,
      intent,
      confidence,
      parsedQuery,
      retrieval,
      matched: contexts.map(({ id, title, category, score }) => ({ id, title, category, score })),
    };
  }

  if (!shouldAnswer) {
    return {
      answer: buildFallbackAnswer(cleanMessage, [], []),
      mode: 'no_answer',
      intent,
      confidence: 'low',
      products: [],
      sources: [],
      parsedQuery,
      retrieval,
      matched: [],
    };
  }

  const provider = options.provider === undefined ? selectProvider() : options.provider;

  if (!provider) {
    return {
      answer: buildFallbackAnswer(cleanMessage, contexts, products),
      mode: 'retrieval_fallback',
      products,
      sources,
      intent,
      confidence,
      parsedQuery,
      retrieval,
      matched: contexts.map(({ id, title, category, score }) => ({ id, title, category, score })),
    };
  }

  try {
    const providerResult = await provider.call({
      message: cleanMessage,
      contexts,
      products,
      provider,
    });
    const rawAnswer =
      typeof providerResult === 'string' ? providerResult : String(providerResult?.answer || '');
    const groundedAnswer = sanitizeGroundedAnswer(rawAnswer, products, sources);
    const citationResult = validateCitations(groundedAnswer, { products, sources });

    if (!citationResult.valid) {
      return {
        answer: buildFallbackAnswer(cleanMessage, contexts, products),
        mode: 'citation_fallback',
        provider: provider.id,
        model: provider.model,
        intent,
        confidence,
        products,
        sources,
        parsedQuery,
        retrieval,
        citationIssues: {
          invalid: citationResult.invalidCitations.length,
          unsupported: citationResult.unsupportedClaims.length,
        },
      };
    }

    return {
      answer: citationResult.answer,
      mode: `${provider.id}_rag`,
      provider: provider.id,
      model: provider.model,
      usage: typeof providerResult === 'string' ? undefined : providerResult.usage,
      intent,
      confidence,
      parsedQuery,
      products,
      sources,
      retrieval,
      matched: contexts.map(({ id, title, category, score }) => ({ id, title, category, score })),
    };
  } catch (error) {
    return {
      answer: buildFallbackAnswer(cleanMessage, contexts, products),
      mode: `${provider.id}_error_fallback`,
      provider: provider.id,
      model: provider.model,
      intent,
      confidence,
      parsedQuery,
      products,
      sources,
      retrieval,
      warning:
        'AI provider hien chua san sang. He thong da tra loi bang du lieu FAQ/chinh sach noi bo.',
      matched: contexts.map(({ id, title, category, score }) => ({ id, title, category, score })),
    };
  }
}

module.exports = {
  answerAiSupportQuestion,
  buildFallbackAnswer,
  mergeProductRecommendations,
  parsePriceFilters,
  retrieveKnowledge,
  retrieveAdvisorContext,
  retrieveProductRecommendations,
  sanitizeGroundedAnswer,
  selectProvider,
  tokenize,
};
