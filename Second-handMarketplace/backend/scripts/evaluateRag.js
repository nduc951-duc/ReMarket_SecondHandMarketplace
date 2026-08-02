const fs = require('node:fs');
const path = require('node:path');
const { retrieveAdvisorContext } = require('../src/services/aiSupportService');

const suite = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'evals', 'rag-vietnamese.json'), 'utf8'),
);

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
  let passed = 0;
  let vectorQueries = 0;

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
  if (passRate < 0.9 || (requireVector && vectorQueries !== suite.length)) process.exitCode = 1;
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = { evaluateScenario };
