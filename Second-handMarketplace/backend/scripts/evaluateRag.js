const fs = require('node:fs');
const path = require('node:path');
const { retrieveAdvisorContext } = require('../src/services/aiSupportService');
const { retrieveKnowledge } = require('../src/services/aiSupportService');
const { routeIntent } = require('../src/rag/retrieval/intentRouter');
const { parseProductQuery } = require('../src/rag/retrieval/queryParser');

const suite = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'evals', 'rag-vietnamese.json'), 'utf8'),
);
const baseline = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'evals', 'rag-baseline.json'), 'utf8'),
);

function closeEnough(left, right) {
  return String(left ?? '') === String(right ?? '');
}

function evaluateOfflineScenario(scenario) {
  const routed = routeIntent(scenario.query);
  const parsed = parseProductQuery(scenario.query);
  const rankedSources = retrieveKnowledge(scenario.query, { limit: 5 }).map((item) => item.id);
  const expectedSources = scenario.expectedSourceKeys || [];
  const firstRelevantRank = expectedSources.length
    ? rankedSources.findIndex((sourceKey) => expectedSources.includes(sourceKey)) + 1
    : 0;
  const filterFields = [
    'minPrice',
    'maxPrice',
    'category',
    'condition',
    'location',
    'semanticQuery',
  ];
  const expectedFilters = filterFields.filter((field) => scenario[field] !== undefined);
  const correctFilters = expectedFilters.filter((field) =>
    closeEnough(parsed[field], scenario[field]),
  );
  return {
    intentCorrect: !scenario.expectedIntent || routed.intent === scenario.expectedIntent,
    sourceEvaluated: expectedSources.length > 0,
    recalledAt5: !expectedSources.length || firstRelevantRank > 0,
    reciprocalRank: firstRelevantRank > 0 ? 1 / firstRelevantRank : 0,
    filterChecks: expectedFilters.length,
    correctFilters: correctFilters.length,
    routed,
    parsed,
    rankedSources,
  };
}

function evaluateSuiteOffline(scenarios = suite) {
  const results = scenarios.map(evaluateOfflineScenario);
  const sourceResults = results.filter((result) => result.sourceEvaluated);
  const filterChecks = results.reduce((total, result) => total + result.filterChecks, 0);
  return {
    total: results.length,
    intentAccuracy: results.filter((result) => result.intentCorrect).length / results.length,
    recallAt5:
      sourceResults.filter((result) => result.recalledAt5).length /
      Math.max(1, sourceResults.length),
    mrr:
      sourceResults.reduce((total, result) => total + result.reciprocalRank, 0) /
      Math.max(1, sourceResults.length),
    filterAccuracy:
      results.reduce((total, result) => total + result.correctFilters, 0) /
      Math.max(1, filterChecks),
    results,
  };
}

function meetsBaseline(metrics, thresholds = baseline) {
  return ['intentAccuracy', 'recallAt5', 'mrr', 'filterAccuracy'].every(
    (metric) => Number(metrics[metric]) >= Number(thresholds[metric]),
  );
}

function evaluateScenario(scenario, result) {
  const failures = [];
  const sourceKeys = new Set((result.sources || []).map((source) => source.sourceKey));
  const products = result.products || [];

  if (
    scenario.expectedSourceKeys?.length &&
    !scenario.expectedSourceKeys.some((sourceKey) => sourceKeys.has(sourceKey))
  ) {
    failures.push(`missing source: ${scenario.expectedSourceKeys.join(' or ')}`);
  }
  if (scenario.productIntent && result.productRequest !== true) {
    failures.push('product intent not detected');
  }
  if (
    scenario.minPrice !== undefined &&
    products.some((product) => Number(product.price) < scenario.minPrice)
  ) {
    failures.push('product below minimum price');
  }
  if (
    scenario.maxPrice !== undefined &&
    products.some((product) => Number(product.price) > scenario.maxPrice)
  ) {
    failures.push('product above maximum price');
  }
  if (
    products.some((product) => !product.id || !product.title || !Number.isFinite(product.price))
  ) {
    failures.push('ungrounded product payload');
  }

  return { passed: failures.length === 0, failures };
}

async function main() {
  const requireVector = process.argv.includes('--require-vector');
  const runLive = requireVector || process.argv.includes('--live');
  let passed = 0;
  let vectorQueries = 0;
  const offline = evaluateSuiteOffline(suite);

  console.log(
    `METRICS | intent_accuracy=${offline.intentAccuracy.toFixed(3)} | recall_at_5=${offline.recallAt5.toFixed(3)} | mrr=${offline.mrr.toFixed(3)} | filter_accuracy=${offline.filterAccuracy.toFixed(3)}`,
  );

  if (!runLive) {
    if (!meetsBaseline(offline)) process.exitCode = 1;
    return;
  }

  for (const scenario of suite) {
    const result = await retrieveAdvisorContext(scenario.query);
    const evaluation = evaluateScenario(scenario, result);
    if (result.retrieval.mode === 'hybrid_vector') vectorQueries += 1;
    if (evaluation.passed) passed += 1;
    console.log(
      `${evaluation.passed ? 'PASS' : 'FAIL'} | ${scenario.id} | ${result.retrieval.mode}${
        evaluation.failures.length ? ` | ${evaluation.failures.join(', ')}` : ''
      }`,
    );
  }

  const passRate = passed / suite.length;
  console.log(
    `SUMMARY | passed=${passed}/${suite.length} | pass_rate=${(passRate * 100).toFixed(1)}% | vector_queries=${vectorQueries}/${suite.length}`,
  );
  if (
    !meetsBaseline(offline) ||
    passRate < 0.9 ||
    (requireVector && vectorQueries !== suite.length)
  ) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  evaluateOfflineScenario,
  evaluateScenario,
  evaluateSuiteOffline,
  meetsBaseline,
};
