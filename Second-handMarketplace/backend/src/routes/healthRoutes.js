const express = require('express');
const { healthHandler, readinessHandler } = require('../controllers/healthController');

const router = express.Router();

router.get('/health', healthHandler);
router.get('/ready', readinessHandler);

module.exports = router;
