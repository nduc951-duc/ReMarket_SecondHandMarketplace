function candidateScore(candidate = {}) {
  return Math.max(
    Number(candidate.rerankScore || 0),
    Number(candidate.score || 0),
    Number(candidate.similarity || 0),
    Number(candidate.relevance_score || 0),
  );
}

function assessRetrievalConfidence(candidates = [], options = {}) {
  const threshold = Number(options.threshold ?? process.env.RAG_MIN_RETRIEVAL_SCORE ?? 0.12);
  const scores = candidates
    .map(candidateScore)
    .filter(Number.isFinite)
    .sort((a, b) => b - a);
  const bestScore = scores[0] || 0;
  const accepted = candidates.filter((candidate) => candidateScore(candidate) >= threshold);
  const confidence =
    bestScore >= threshold * 2 ? 'high' : bestScore >= threshold ? 'medium' : 'low';
  return { confidence, bestScore, threshold, accepted, shouldAnswer: accepted.length > 0 };
}

module.exports = { assessRetrievalConfidence, candidateScore };
