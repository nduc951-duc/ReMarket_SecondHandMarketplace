const {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_PROVIDER,
  EMBEDDING_VERSION,
  VECTOR_RAG_ENABLED,
} = require('../config/env');

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_EMBEDDING_INPUT_CHARS = 12000;

function buildServiceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getEmbeddingConfig() {
  const provider = String(EMBEDDING_PROVIDER || 'gemini').toLowerCase();
  return {
    enabled: VECTOR_RAG_ENABLED,
    provider,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    version: EMBEDDING_VERSION,
    apiKey:
      provider === 'gemini'
        ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
        : process.env.OPENAI_API_KEY || '',
  };
}

function isEmbeddingConfigured(config = getEmbeddingConfig()) {
  return Boolean(
    config.enabled &&
    ['gemini', 'openai'].includes(config.provider) &&
    config.apiKey &&
    config.model &&
    config.dimensions === 1536,
  );
}

function normalizeVector(values, dimensions) {
  if (!Array.isArray(values) || values.length !== dimensions) {
    throw buildServiceError('Embedding provider tra ve vector sai kich thuoc.', 502);
  }
  const vector = values.map(Number);
  if (vector.some((value) => !Number.isFinite(value))) {
    throw buildServiceError('Embedding provider tra ve vector khong hop le.', 502);
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) {
    throw buildServiceError('Embedding provider tra ve vector rong.', 502);
  }
  return vector.map((value) => value / magnitude);
}

async function callOpenAiEmbeddings(normalizedInputs, config, fetchImpl) {
  const response = await fetchImpl(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: normalizedInputs,
      dimensions: config.dimensions,
      encoding_format: 'float',
    }),
  });
  const result = await response.json().catch(() => ({}));
  const ordered = [...(result.data || [])].sort((left, right) => left.index - right.index);
  return { response, result, values: ordered.map((item) => item.embedding) };
}

async function callGeminiEmbeddings(normalizedInputs, config, fetchImpl, taskType) {
  const model = String(config.model).replace(/^models\//, '');
  const response = await fetchImpl(
    `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:batchEmbedContents`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey,
      },
      body: JSON.stringify({
        requests: normalizedInputs.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: config.dimensions,
        })),
      }),
    },
  );
  const result = await response.json().catch(() => ({}));
  return {
    response,
    result,
    values: (result.embeddings || []).map((embedding) => embedding.values),
  };
}

function normalizeEmbeddingInput(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_EMBEDDING_INPUT_CHARS);
}

async function generateEmbeddings(inputs, options = {}) {
  const config = options.config || getEmbeddingConfig();
  const fetchImpl = options.fetchImpl || fetch;
  const normalizedInputs = (Array.isArray(inputs) ? inputs : [inputs])
    .map(normalizeEmbeddingInput)
    .filter(Boolean);

  if (!normalizedInputs.length) {
    throw buildServiceError('Khong co noi dung de tao embedding.', 400);
  }
  if (!isEmbeddingConfigured(config)) {
    throw buildServiceError(
      'Vector RAG chua duoc bat hoac embedding provider chua duoc cau hinh.',
      503,
    );
  }

  const providerResult =
    config.provider === 'gemini'
      ? await callGeminiEmbeddings(
          normalizedInputs,
          config,
          fetchImpl,
          options.taskType || 'RETRIEVAL_DOCUMENT',
        )
      : await callOpenAiEmbeddings(normalizedInputs, config, fetchImpl);
  const { response, result, values } = providerResult;

  if (!response.ok) {
    throw buildServiceError(
      result.error?.message || 'Embedding provider khong phan hoi thanh cong.',
      502,
    );
  }

  if (values.length !== normalizedInputs.length) {
    throw buildServiceError('Embedding provider tra ve sai so luong vector.', 502);
  }

  const embeddings = values.map((embedding) => normalizeVector(embedding, config.dimensions));

  return {
    embeddings,
    provider: config.provider,
    model: config.model,
    dimensions: config.dimensions,
    version: config.version,
    usage: result.usage || null,
  };
}

async function generateQueryEmbedding(input, options = {}) {
  const result = await generateEmbeddings([input], {
    ...options,
    taskType: 'RETRIEVAL_QUERY',
  });
  return {
    embedding: result.embeddings[0],
    provider: result.provider,
    model: result.model,
    dimensions: result.dimensions,
    version: result.version,
    usage: result.usage,
  };
}

module.exports = {
  MAX_EMBEDDING_INPUT_CHARS,
  generateEmbeddings,
  generateQueryEmbedding,
  getEmbeddingConfig,
  isEmbeddingConfigured,
  normalizeVector,
  normalizeEmbeddingInput,
};
