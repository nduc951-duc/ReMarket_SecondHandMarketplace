const express = require('express');
const {
  createProductHandler,
  getProductsHandler,
  getProductByIdHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductsBySellerHandler,
  getMyProductsHandler,
  autocompleteProductsHandler,
} = require('../controllers/productController');
const { attachUserIfPresent, requireAuth } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { createProduct } = require('../validation/requestSchemas');

const router = express.Router();

// Public routes — specific paths FIRST, then parameterized
router.get('/autocomplete', autocompleteProductsHandler);
router.get('/', attachUserIfPresent, getProductsHandler);
router.get('/seller/:sellerId', attachUserIfPresent, getProductsBySellerHandler);
router.get('/user/my', requireAuth, getMyProductsHandler);
router.get('/:id', attachUserIfPresent, getProductByIdHandler);

// Protected routes (require authentication)
router.use(requireAuth);
router.post('/', validateRequest(createProduct), createProductHandler);

router.patch('/:id', updateProductHandler);
router.delete('/:id', deleteProductHandler);

module.exports = router;
