const express = require('express');
const { getCategoriesHandler } = require('../controllers/categoryController');

const router = express.Router();

router.get('/', getCategoriesHandler);

module.exports = router;
