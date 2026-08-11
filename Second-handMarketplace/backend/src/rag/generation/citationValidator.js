const { normalizeVietnamese } = require('../retrieval/intentRouter');

function tokenize(value) {
  return new Set(
    normalizeVietnamese(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  );
}

function hasSupport(claim, sourceText) {
  const claimTerms = tokenize(claim);
  const sourceTerms = tokenize(sourceText);
  if (!claimTerms.size) return true;
  let overlap = 0;
  claimTerms.forEach((term) => {
    if (sourceTerms.has(term)) overlap += 1;
  });
  return overlap >= Math.min(2, claimTerms.size);
}

function validateCitations(answer, { sources = [], products = [] } = {}) {
  const sourceMap = new Map(
    sources.map((source) => [
      String(source.id),
      `${source.title || ''} ${source.excerpt || source.content || ''}`,
    ]),
  );
  const productMap = new Map(
    products.map((product) => [
      String(product.citation_id),
      `${product.title || ''} ${product.price || ''} ${product.condition || ''} ${product.location || ''} /products/${product.id}`,
    ]),
  );
  const productIds = new Set(products.map((product) => String(product.id)));
  const invalidCitations = [];
  let sanitized = String(answer || '').replace(/\/products\/([a-zA-Z0-9-]+)/g, (link, id) => {
    if (productIds.has(id)) return link;
    invalidCitations.push(link);
    return '';
  });

  sanitized = sanitized.replace(/\[([DP]\d+)\]/g, (citation, id) => {
    if (sourceMap.has(id) || productMap.has(id)) return citation;
    invalidCitations.push(citation);
    return '';
  });

  const unsupportedClaims = [];
  const sensitiveClaim =
    /(gia|vnd|₫|hoan tien|doi tra|chinh sach|bao hanh|tinh trang|con ban|het hang)/i;
  sanitized
    .split(/(?<=[.!?\n])\s+/)
    .map((claim) => claim.trim())
    .filter(Boolean)
    .forEach((claim) => {
      if (!sensitiveClaim.test(normalizeVietnamese(claim))) return;
      const ids = [...claim.matchAll(/\[([DP]\d+)\]/g)].map((match) => match[1]);
      if (!ids.length) {
        unsupportedClaims.push(claim);
        return;
      }
      const supported = ids.some((id) =>
        hasSupport(claim, sourceMap.get(id) || productMap.get(id)),
      );
      if (!supported) unsupportedClaims.push(claim);
    });

  return {
    answer: sanitized
      .replace(/[ \t]+\n/g, '\n')
      .replace(/ {2,}/g, ' ')
      .trim(),
    valid: invalidCitations.length === 0 && unsupportedClaims.length === 0,
    invalidCitations,
    unsupportedClaims,
  };
}

module.exports = { hasSupport, validateCitations };
