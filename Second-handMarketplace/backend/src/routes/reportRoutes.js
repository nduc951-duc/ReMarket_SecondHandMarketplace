const express = require('express');
const { createReportHandler, getMyReportsHandler } = require('../controllers/reportController');
const { requireAuth } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { createReport } = require('../validation/requestSchemas');

const router = express.Router();

router.use(requireAuth);
router.post('/', validateRequest(createReport), createReportHandler);
router.get('/mine', getMyReportsHandler);

module.exports = router;
