const express = require('express');
const {
  createProductHandler,
  getProductsHandler,
  getProductByIdHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductsBySellerHandler,
  getMyProductsHandler,
} = require('../controllers/productController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes — specific paths FIRST, then parameterized
router.get('/', getProductsHandler);
router.get('/seller/:sellerId', getProductsBySellerHandler);

// Protected routes (require authentication)
router.use(requireAuth);
router.post('/', createProductHandler);
router.get('/user/my', getMyProductsHandler);

// Parameterized route LAST (public, but after specific paths)
// We temporarily remove auth for GET /:id so it's public
router.get('/:id', getProductByIdHandler);

router.patch('/:id', updateProductHandler);
router.delete('/:id', deleteProductHandler);

module.exports = router;