const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const aiKnowledgeBase = require('../data/aiKnowledgeBase');
const { semanticChunkDocument } = require('../rag/ingestion/semanticChunker');
const {
  EMBEDDING_MODEL,
  EMBEDDING_VERSION,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');

function contentHash(value) {
  return crypto
    .createHash('sha256')
    .update(String(value || ''), 'utf8')
    .digest('hex');
}

function chunkDocument(value, { maxChars = 900, overlapChars = 120 } = {}) {
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!text) return [];

  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let currentWords = [];

  const overlapTail = (chunkWords) => {
    const tail = [];
    let length = 0;
    for (let index = chunkWords.length - 1; index >= 0; index -= 1) {
      const word = chunkWords[index];
      if (tail.length && length + word.length + 1 > overlapChars) break;
      tail.unshift(word);
      length += word.length + (tail.length > 1 ? 1 : 0);
    }
    return tail;
  };

  for (const word of words) {
    const candidate = [...currentWords, word].join(' ');
    if (currentWords.length && candidate.length > maxChars) {
      chunks.push(currentWords.join(' '));
      currentWords = [...overlapTail(currentWords), word];
    } else {
      currentWords.push(word);
    }
  }

  if (currentWords.length) {
    const finalChunk = currentWords.join(' ');
    if (!chunks.length || finalChunk !== chunks.at(-1)) chunks.push(finalChunk);
  }
  return chunks;
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Thieu cau hinh Supabase de dong bo RAG documents.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function syncKnowledgeDocuments(items = aiKnowledgeBase, options = {}) {
  const client = options.client || getAdminClient();
  let chunkCount = 0;
  let unchanged = 0;
  let deactivated = 0;
  const { data: existingRows, error: existingError } = await client
    .from('ai_documents')
    .select('id, source_key, content_hash, active, metadata');
  if (existingError) throw existingError;
  const managedRows = (existingRows || []).filter(
    (row) => row.metadata?.source === 'aiKnowledgeBase',
  );
  const existingBySource = new Map(managedRows.map((row) => [row.source_key, row]));
  const incomingSourceKeys = new Set(items.map((item) => item.id));

  for (const item of items) {
    const documentHash = contentHash(`${item.title}\n${item.content}`);
    const current = existingBySource.get(item.id);
    if (current?.content_hash === documentHash && current.active) {
      unchanged += 1;
      continue;
    }
    const documentPayload = {
      source_key: item.id,
      title: item.title,
      category: item.category || 'knowledge',
      content: item.content,
      content_hash: documentHash,
      metadata: { keywords: item.keywords || [], source: 'aiKnowledgeBase' },
      active: true,
      updated_at: new Date().toISOString(),
    };
    const { data: document, error: documentError } = await client
      .from('ai_documents')
      .upsert(documentPayload, { onConflict: 'source_key' })
      .select('id, source_key')
      .single();
    if (documentError) throw documentError;

    const chunks = semanticChunkDocument(
      {
        title: item.title,
        category: item.category || 'knowledge',
        sourceKey: item.id,
        content: item.content,
      },
      options.chunking,
    );
    const chunkRows = chunks.map((chunk, chunkIndex) => ({
      document_id: document.id,
      chunk_index: chunkIndex,
      content: chunk.content,
      content_hash: chunk.contentHash,
      metadata: {
        source_key: item.id,
        title: item.title,
        category: item.category || 'knowledge',
        heading: chunk.heading,
        token_count: chunk.tokenCount,
      },
      updated_at: new Date().toISOString(),
    }));
    if (chunkRows.length) {
      const { error: chunkError } = await client
        .from('ai_document_chunks')
        .upsert(chunkRows, { onConflict: 'document_id,chunk_index' });
      if (chunkError) throw chunkError;
    }

    const { error: deleteError } = await client
      .from('ai_document_chunks')
      .delete()
      .eq('document_id', document.id)
      .gte('chunk_index', chunkRows.length);
    if (deleteError) throw deleteError;
    chunkCount += chunkRows.length;
  }

  for (const row of managedRows) {
    if (!row.active || incomingSourceKeys.has(row.source_key)) continue;
    const { error } = await client
      .from('ai_documents')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (error) throw error;
    deactivated += 1;
  }

  return { documents: items.length, chunks: chunkCount, unchanged, deactivated };
}

async function enqueueEmbeddingReindex(options = {}) {
  const client = options.client || getAdminClient();
  const { data, error } = await client.rpc('enqueue_embedding_reindex', {
    target_model: options.model || EMBEDDING_MODEL,
    target_version: options.version || EMBEDDING_VERSION,
  });
  if (error) throw error;
  return Number(data || 0);
}

module.exports = {
  chunkDocument,
  contentHash,
  enqueueEmbeddingReindex,
  syncKnowledgeDocuments,
};
