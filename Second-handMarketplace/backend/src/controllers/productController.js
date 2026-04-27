const {
  createProduct,
  getProductById,
  getProducts,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  hasOpenTransactionsForProduct,
} = require('../models/products/productModel');

const ALLOWED_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];
const ALLOWED_PRODUCT_STATUSES = ['active', 'sold', 'hidden'];

/**
 * POST /api/products
 * Create a new product
 */
async function createProductHandler(req, res) {
  try {
    const {
      title,
      description,
      price,
      category,
      condition,
      images,
      location,
    } = req.body;

    const normalizedTitle = title ? String(title).trim() : '';
    const normalizedPrice = Number(price);
    const normalizedCategory = category ? String(category).trim() : '';
    const normalizedImages = Array.isArray(images) ? images : [];
    const normalizedCondition = condition || 'good';

    // Validation
    if (!normalizedTitle) {
      return res.status(400).json({
        ok: false,
        message: 'Tiêu đề sản phẩm là bắt buộc.',
      });
    }

    if (normalizedTitle.length < 10 || normalizedTitle.length > 200) {
      return res.status(400).json({
        ok: false,
        message: 'Tiêu đề sản phẩm phải từ 10 đến 200 ký tự.',
      });
    }

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'Giá sản phẩm phải là số dương.',
      });
    }

    if (!normalizedCategory) {
      return res.status(400).json({
        ok: false,
        message: 'Danh mục sản phẩm là bắt buộc.',
      });
    }

    if (normalizedImages.length < 1 || normalizedImages.length > 5) {
      return res.status(400).json({
        ok: false,
        message: 'Sản phẩm phải có từ 1 đến 5 hình ảnh.',
      });
    }

    if (!ALLOWED_CONDITIONS.includes(normalizedCondition)) {
      return res.status(400).json({
        ok: false,
        message: 'Tình trạng sản phẩm không hợp lệ.',
      });
    }

    const productData = {
      seller_id: req.user.id,
      title: normalizedTitle,
      description: description ? description.trim() : '',
      price: normalizedPrice,
      category: normalizedCategory,
      condition: normalizedCondition,
      images: normalizedImages,
      location: location ? location.trim() : '',
    };

    const product = await createProduct(productData);

    return res.status(201).json({
      ok: true,
      data: product,
      message: 'Tạo sản phẩm thành công.',
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Không thể tạo sản phẩm.',
    });
  }
}

/**
 * GET /api/products
 * Get products with pagination and filters
 * Query params: page, limit, category, condition, search, min_price, max_price
 */
async function getProductsHandler(req, res) {
  try {
    const result = await getProducts({
      page: req.query.page,
      limit: req.query.limit,
      category: req.query.category,
      condition: req.query.condition,
      search: req.query.search,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
    });

    return res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Không thể lấy danh sách sản phẩm.',
    });
  }
}

/**
 * GET /api/products/:id
 * Get product by ID
 */
async function getProductByIdHandler(req, res) {
  try {
    const { id } = req.params;

    const product = await getProductById(id);

    if (!product) {
      return res.status(404).json({
        ok: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    // Public endpoint only returns visible listings.
    if (!['active', 'sold'].includes(product.status)) {
      return res.status(404).json({
        ok: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    return res.status(200).json({
      ok: true,
      data: product,
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Không thể lấy thông tin sản phẩm.',
    });
  }
}

/**
 * PATCH /api/products/:id
 * Update product
 */
async function updateProductHandler(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      category,
      condition,
      images,
      location,
      status,
    } = req.body;

    const hasOpenOrders = await hasOpenTransactionsForProduct(id);
    if (hasOpenOrders) {
      return res.status(400).json({
        ok: false,
        message: 'Không thể sửa sản phẩm khi đang có đơn hàng chờ xử lý.',
      });
    }

    // Validation
    if (title !== undefined) {
      const trimmedTitle = title ? String(title).trim() : '';
      if (!trimmedTitle) {
        return res.status(400).json({
          ok: false,
          message: 'Tiêu đề sản phẩm không được để trống.',
        });
      }

      if (trimmedTitle.length < 10 || trimmedTitle.length > 200) {
        return res.status(400).json({
          ok: false,
          message: 'Tiêu đề sản phẩm phải từ 10 đến 200 ký tự.',
        });
      }
    }

    if (price !== undefined) {
      const normalizedPrice = Number(price);
      if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
        return res.status(400).json({
          ok: false,
          message: 'Giá sản phẩm phải là số dương.',
        });
      }
    }

    if (condition !== undefined && !ALLOWED_CONDITIONS.includes(condition)) {
      return res.status(400).json({
        ok: false,
        message: 'Tình trạng sản phẩm không hợp lệ.',
      });
    }

    if (images !== undefined && (!Array.isArray(images) || images.length < 1 || images.length > 5)) {
      return res.status(400).json({
        ok: false,
        message: 'Sản phẩm phải có từ 1 đến 5 hình ảnh.',
      });
    }

    if (status !== undefined && !ALLOWED_PRODUCT_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        message: 'Trạng thái sản phẩm không hợp lệ.',
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : '';
    if (price !== undefined) updateData.price = Number(price);
    if (category !== undefined) updateData.category = category ? category.trim() : '';
    if (condition !== undefined) updateData.condition = condition;
    if (images !== undefined) updateData.images = images;
    if (location !== undefined) updateData.location = location ? location.trim() : '';
    if (status !== undefined) updateData.status = status;

    const product = await updateProduct(id, req.user.id, updateData);

    return res.status(200).json({
      ok: true,
      data: product,
      message: 'Cập nhật sản phẩm thành công.',
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Không thể cập nhật sản phẩm.',
    });
  }
}

/**
 * DELETE /api/products/:id
 * Delete product
 */
async function deleteProductHandler(req, res) {
  try {
    const { id } = req.params;

    const hasOpenOrders = await hasOpenTransactionsForProduct(id);
    if (hasOpenOrders) {
      return res.status(400).json({
        ok: false,
        message: 'Không thể ẩn sản phẩm khi đang có đơn hàng chờ xử lý.',
      });
    }

    await deleteProduct(id, req.user.id);

    return res.status(200).json({
      ok: true,
      message: 'Ẩn sản phẩm thành công.',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Không thể xóa sản phẩm.',
    });
  }
}

/**
 * GET /api/products/seller/:sellerId
 * Get products by seller
 * Query params: page, limit, status
 */
async function getProductsBySellerHandler(req, res) {
  try {
    const { sellerId } = req.params;
    const publicStatus = req.query.status === 'active' ? 'active' : null;

    const result = await getProductsBySeller(sellerId, {
      page: req.query.page,
      limit: req.query.limit,
      status: publicStatus,
      includeAllStatuses: false,
    });

    return res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (error) {
    console.error('Get products by seller error:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Không thể lấy sản phẩm của người bán.',
    });
  }
}

/**
 * GET /api/products/my
 * Get current user's products
 * Query params: page, limit, status
 */
async function getMyProductsHandler(req, res) {
  try {
    const result = await getProductsBySeller(req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      includeAllStatuses: true,
    });

    return res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (error) {
    console.error('Get my products error:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Không thể lấy sản phẩm của bạn.',
    });
  }
}

module.exports = {
  createProductHandler,
  getProductsHandler,
  getProductByIdHandler,
  updateProductHandler,
  deleteProductHandler,
  getProductsBySellerHandler,
  getMyProductsHandler,
};