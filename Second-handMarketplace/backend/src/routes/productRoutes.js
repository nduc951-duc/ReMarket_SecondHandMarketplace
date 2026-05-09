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
const { attachUserIfPresent, requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes — specific paths FIRST, then parameterized
router.get('/', attachUserIfPresent, getProductsHandler);
router.get('/seller/:sellerId', attachUserIfPresent, getProductsBySellerHandler);
router.get('/user/my', requireAuth, getMyProductsHandler);
router.get('/:id', attachUserIfPresent, getProductByIdHandler);

// Protected routes (require authentication)
router.use(requireAuth);
router.post('/', createProductHandler);

router.patch('/:id', updateProductHandler);
router.delete('/:id', deleteProductHandler);

module.exports = router;