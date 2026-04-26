const {
  getProfile,
  updateProfile,
  uploadAvatar,
} = require('../services/profileService');

/**
 * GET /api/profile
 * Returns the authenticated user's profile.
 */
async function getProfileHandler(req, res) {
  try {
    const profile = await getProfile(req.user.id);

    return res.status(200).json({
      ok: true,
      data: profile,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || 'Khong the lay thong tin ho so.',
    });
  }
}

/**
 * PUT /api/profile
 * Updates the authenticated user's profile.
 * Body: { full_name, phone, address, bio }
 */
async function updateProfileHandler(req, res) {
  const { full_name, phone, address, bio } = req.body || {};

  // Validate
  const errors = [];

  if (full_name !== undefined) {
    const trimmed = typeof full_name === 'string' ? full_name.trim() : '';
    if (trimmed.length < 2) {
      errors.push('Ho ten phai co it nhat 2 ky tu.');
    }
  }

  if (phone !== undefined) {
    const trimmed = typeof phone === 'string' ? phone.trim() : '';
    if (trimmed && !/^[0-9+\-\s()]{8,15}$/.test(trimmed)) {
      errors.push('So dien thoai khong hop le.');
    }
  }

  if (bio !== undefined) {
    const trimmed = typeof bio === 'string' ? bio.trim() : '';
    if (trimmed.length > 500) {
      errors.push('Bio khong duoc vuot qua 500 ky tu.');
    }
  }

  if (address !== undefined) {
    const trimmed = typeof address === 'string' ? address.trim() : '';
    if (trimmed.length > 300) {
      errors.push('Dia chi khong duoc vuot qua 300 ky tu.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      message: 'Du lieu cap nhat khong hop le.',
      errors,
    });
  }

  try {
    const updated = await updateProfile(req.user.id, {
      full_name,
      phone,
      address,
      bio,
    });

    return res.status(200).json({
      ok: true,
      message: 'Cap nhat ho so thanh cong.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || 'Khong the cap nhat ho so.',
    });
  }
}

/**
 * POST /api/profile/avatar
 * Upload avatar image (multipart/form-data with field "avatar").
 */
async function uploadAvatarHandler(req, res) {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      message: 'Vui long chon file anh.',
    });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      ok: false,
      message: 'Chi chap nhan file anh (JPEG, PNG, WebP, GIF).',
    });
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({
      ok: false,
      message: 'File anh khong duoc vuot qua 5MB.',
    });
  }

  try {
    const updated = await uploadAvatar(
      req.user.id,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
    );

    return res.status(200).json({
      ok: true,
      message: 'Cap nhat avatar thanh cong.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || 'Khong the upload avatar.',
    });
  }
}

module.exports = {
  getProfileHandler,
  updateProfileHandler,
  uploadAvatarHandler,
};
