const { uploadImage } = require('../services/uploadService');

/**
 * POST /api/upload/images
 * Upload product images
 */
async function uploadImagesHandler(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'Không có file nào được upload.',
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      try {
        const result = await uploadImage(
          file.buffer,
          file.originalname,
          file.mimetype,
          req.user.id
        );
        uploadedImages.push(result);
      } catch (error) {
        console.error('Error uploading image:', error);
        // Continue with other images if one fails
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(500).json({
        ok: false,
        message: 'Không thể upload bất kỳ hình ảnh nào.',
      });
    }

    return res.status(200).json({
      ok: true,
      data: uploadedImages,
      message: `Upload thành công ${uploadedImages.length} hình ảnh.`,
    });
  } catch (error) {
    console.error('Upload images error:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Không thể upload hình ảnh.',
    });
  }
}

module.exports = {
  uploadImagesHandler,
};