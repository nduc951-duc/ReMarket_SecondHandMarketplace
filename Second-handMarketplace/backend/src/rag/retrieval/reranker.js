const { normalizeVietnamese } = require('./intentRouter');

function terms(value) {
  return new Set(
    normalizeVietnamese(value)
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 1),
  );
}

function overlapScore(query, candidate) {
  const queryTerms = terms(query);
  const candidateTerms = terms(
    `${candidate.title || ''} ${candidate.content || candidate.description || ''}`,
  );
  if (!queryTerms.size || !candidateTerms.size) return 0;
  let overlap = 0;
  queryTerms.forEach((term) => {
    if (candidateTerms.has(term)) overlap += 1;
  });
  return overlap / queryTerms.size;
}

function contentFingerprint(candidate) {
  return normalizeVietnamese(candidate.content || candidate.description || candidate.title || '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function rerankCandidates(query, candidates = [], options = {}) {
  const enabled = options.enabled ?? true;
  const candidateLimit = Math.min(20, Math.max(15, Number(options.candidateLimit || 18)));
  const topK = Math.min(6, Math.max(4, Number(options.topK || 5)));
  const pool = candidates.slice(0, candidateLimit);
  if (!enabled) return pool.slice(0, topK);

  const seen = new Set();
  return pool
    .map((candidate) => {
      const baseScore = Number(
        candidate.hybrid_score ??
          candidate.score ??
          candidate.similarity ??
          candidate.relevance_score ??
          0,
      );
      const lexicalScore = overlapScore(query, candidate);
      return { ...candidate, rerankScore: baseScore * 0.65 + lexicalScore * 0.35 };
    })
    .sort((left, right) => right.rerankScore - left.rerankScore)
    .filter((candidate) => {
      const fingerprint = contentFingerprint(candidate);
      if (!fingerprint || seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    })
    .slice(0, topK);
}

module.exports = { overlapScore, rerankCandidates };
