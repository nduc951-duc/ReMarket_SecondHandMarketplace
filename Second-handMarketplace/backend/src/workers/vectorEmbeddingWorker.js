const { createClient } = require('@supabase/supabase-js');
const {
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_WORKER_INTERVAL_MS,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');
const {
  generateEmbeddings,
  getEmbeddingConfig,
  isEmbeddingConfigured,
} = require('../services/embeddingService');

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Thieu cau hinh Supabase cho embedding worker.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeErrorMessage(error) {
  return String(error?.message || 'Embedding provider error')
    .replace(/(?:sk|key|token)-[a-z0-9_-]+/gi, '[REDACTED]')
    .slice(0, 500);
}

function retryDelaySeconds(attempts) {
  return Math.min(3600, 15 * 2 ** Math.max(0, Number(attempts || 1) - 1));
}

async function loadJobSource(client, job) {
  if (job.entity_type === 'document_chunk') {
    const { data, error } = await client
      .from('ai_document_chunks')
      .select('id, content, content_hash')
      .eq('id', job.entity_id)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.content_hash !== job.content_hash) return null;
    return { job, content: data.content };
  }

  const { data, error } = await client
    .from('product_embeddings')
    .select('product_id, searchable_text, content_hash')
    .eq('product_id', job.entity_id)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.content_hash !== job.content_hash) return null;
  return { job, content: data.searchable_text };
}

async function markJobStale(client, jobId) {
  await client
    .from('embedding_jobs')
    .update({
      status: 'stale',
      locked_at: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'processing');
}

async function failJob(client, job, error) {
  const { error: rpcError } = await client.rpc('fail_embedding_job', {
    target_job_id: job.id,
    failure_message: safeErrorMessage(error),
    retry_delay_seconds: retryDelaySeconds(job.attempts),
  });
  if (rpcError) throw rpcError;
}

async function completeJob(client, job, embedding, result) {
  const { data, error } = await client.rpc('complete_embedding_job', {
    target_job_id: job.id,
    result_embedding: embedding,
    result_model: result.model,
    result_version: result.version,
  });
  if (error) throw error;
  return data;
}

async function runEmbeddingBatch({
  client,
  generate = generateEmbeddings,
  config = getEmbeddingConfig(),
  batchSize = EMBEDDING_BATCH_SIZE,
} = {}) {
  if (!isEmbeddingConfigured(config)) {
    return { disabled: true, claimed: 0, completed: 0, stale: 0, failed: 0 };
  }

  const database = client || getAdminClient();
  const { data: jobs, error: claimError } = await database.rpc('claim_embedding_jobs', {
    batch_size: Math.min(50, Math.max(1, Number(batchSize) || 10)),
  });
  if (claimError) throw claimError;
  if (!jobs?.length) {
    return { disabled: false, claimed: 0, completed: 0, stale: 0, failed: 0 };
  }

  const sources = [];
  let stale = 0;
  for (const job of jobs) {
    try {
      const source = await loadJobSource(database, job);
      if (!source) {
        await markJobStale(database, job.id);
        stale += 1;
      } else {
        sources.push(source);
      }
    } catch (error) {
      await failJob(database, job, error);
    }
  }

  if (!sources.length) {
    return {
      disabled: false,
      claimed: jobs.length,
      completed: 0,
      stale,
      failed: jobs.length - stale,
    };
  }

  let generated;
  try {
    generated = await generate(
      sources.map((source) => source.content),
      { config },
    );
  } catch (error) {
    await Promise.all(sources.map((source) => failJob(database, source.job, error)));
    return {
      disabled: false,
      claimed: jobs.length,
      completed: 0,
      stale,
      failed: sources.length,
    };
  }

  let completed = 0;
  let failed = 0;
  await Promise.all(
    sources.map(async (source, index) => {
      try {
        const outcome = await completeJob(
          database,
          source.job,
          generated.embeddings[index],
          generated,
        );
        if (outcome === 'completed') completed += 1;
        else stale += 1;
      } catch (error) {
        failed += 1;
        await failJob(database, source.job, error);
      }
    }),
  );

  return { disabled: false, claimed: jobs.length, completed, stale, failed };
}

function createVectorEmbeddingWorker({
  runBatch = runEmbeddingBatch,
  intervalMs = EMBEDDING_WORKER_INTERVAL_MS,
  logger = console,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
} = {}) {
  let intervalId = null;
  let running = false;

  async function runOnce() {
    if (running) return { skipped: true };
    running = true;
    const startedAt = Date.now();
    try {
      const result = await runBatch();
      logger.log(
        `[vector-embedding] completed claimed=${result.claimed} embedded=${result.completed} stale=${result.stale} failed=${result.failed} duration_ms=${Date.now() - startedAt}`,
      );
      return { skipped: false, ...result };
    } catch (error) {
      logger.error('[vector-embedding] failed', safeErrorMessage(error));
      throw error;
    } finally {
      running = false;
    }
  }

  function runSafely() {
    return runOnce().catch(() => null);
  }

  function start({ runImmediately = true } = {}) {
    if (intervalId) return intervalId;
    if (runImmediately) void runSafely();
    intervalId = setIntervalFn(runSafely, intervalMs);
    logger.log(`[vector-embedding] worker started interval_ms=${intervalMs}`);
    return intervalId;
  }

  function stop() {
    if (!intervalId) return;
    clearIntervalFn(intervalId);
    intervalId = null;
    logger.log('[vector-embedding] worker stopped');
  }

  return { runOnce, start, stop, isRunning: () => Boolean(intervalId) };
}

function startStandaloneWorker() {
  const worker = createVectorEmbeddingWorker();
  process.once('SIGINT', () => worker.stop());
  process.once('SIGTERM', () => worker.stop());
  worker.start();
  return worker;
}

if (require.main === module) startStandaloneWorker();

module.exports = {
  createVectorEmbeddingWorker,
  loadJobSource,
  retryDelaySeconds,
  runEmbeddingBatch,
  safeErrorMessage,
  startStandaloneWorker,
};
