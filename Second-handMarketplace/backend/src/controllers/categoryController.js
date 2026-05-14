const { getCategories } = require('../services/categoryService');

async function getCategoriesHandler(req, res) {
  try {
    const categories = await getCategories();

    return res.status(200).json({
      ok: true,
      data: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Khong the lay danh muc.',
    });
  }
}

module.exports = {
  getCategoriesHandler,
};
