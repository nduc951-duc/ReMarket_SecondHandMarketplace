const express = require('express');
const { askAiSupportHandler } = require('../controllers/aiSupportController');

const router = express.Router();

router.post('/chat', askAiSupportHandler);

module.exports = router;
