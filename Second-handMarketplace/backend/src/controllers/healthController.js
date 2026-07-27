const { checkReadiness } = require('../services/readinessService');

function healthHandler(_req, res) {
  return res.status(200).json({
    ok: true,
    status: 'alive',
    uptimeSeconds: Math.floor(process.uptime()),
  });
}

async function readinessHandler(_req, res) {
  try {
    const result = await checkReadiness();
    return res.status(result.ready ? 200 : 503).json({
      ok: result.ready,
      status: result.ready ? 'ready' : 'not_ready',
      checks: result.checks,
    });
  } catch {
    return res.status(503).json({
      ok: false,
      status: 'not_ready',
      checks: {
        supabase: { ready: false, error: 'dependency_check_failed' },
      },
    });
  }
}

module.exports = {
  healthHandler,
  readinessHandler,
};
