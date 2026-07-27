const { DEMO_READ_ONLY_ADMIN } = require('../config/env');

function requireDemoWriteAccess(_req, res, next) {
  if (DEMO_READ_ONLY_ADMIN) {
    return res.status(403).json({
      ok: false,
      code: 'DEMO_READ_ONLY',
      message: 'Demo admin chi co quyen xem. Thao tac ghi da bi khoa.',
    });
  }

  return next();
}

module.exports = {
  requireDemoWriteAccess,
};
