const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = require('../config/env');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh.'), false);
    }
  },
});

let adminClient = null;

function getAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong backend/.env.',
    );
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

/**
 * Upload image to Supabase storage
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {string} mimeType
 * @param {string} userId
 */
async function uploadImage(fileBuffer, fileName, mimeType, userId) {
  const client = getAdminClient();

  // Generate unique filename
  const timestamp = Date.now();
  const extension = fileName.split('.').pop();
  const uniqueFileName = `${userId}/${timestamp}_${Math.random().toString(36).substring(2)}.${extension}`;

  const { data, error } = await client.storage
    .from('products')
    .upload(uniqueFileName, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Không thể upload hình ảnh: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = client.storage
    .from('products')
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete image from Supabase storage
 * @param {string} imagePath
 */
async function deleteImage(imagePath) {
  const client = getAdminClient();

  const { error } = await client.storage
    .from('products')
    .remove([imagePath]);

  if (error) {
    console.error('Error deleting image:', error);
    // Don't throw error for delete failures, just log
  }
}

module.exports = {
  upload,
  uploadImage,
  deleteImage,
};