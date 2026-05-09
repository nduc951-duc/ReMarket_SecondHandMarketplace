const DEFAULT_BACKEND_URL = 'http://localhost:4000';

/**
 * Get products with pagination and filters
 * @param {object} params - { page, limit, category, condition, search, min_price, max_price }
 */
export async function getProducts(params = {}) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const response = await fetch(`${backendUrl}/api/products?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể lấy danh sách sản phẩm.');
  }

  return data.data;
}

/**
 * Get product by ID
 * @param {string} productId
 */
export async function getProductById(productId, options = {}) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  const headers = {
    'Content-Type': 'application/json',
  };

  if (session?.session?.access_token) {
    headers.Authorization = `Bearer ${session.session.access_token}`;
  }

  const query = new URLSearchParams();
  if (options.skipView) {
    query.set('skip_view', 'true');
  }

  const response = await fetch(`${backendUrl}/api/products/${productId}?${query.toString()}`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể lấy thông tin sản phẩm.');
  }

  return data.data;
}

/**
 * Create a new product
 * @param {object} productData - { title, description, price, category, condition, images, location }
 */
export async function createProduct(productData) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  // Get access token from Supabase
  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để tạo sản phẩm.');
  }

  const response = await fetch(`${backendUrl}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify(productData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tạo sản phẩm.');
  }

  return data.data;
}

/**
 * Update product
 * @param {string} productId
 * @param {object} updateData
 */
export async function updateProduct(productId, updateData) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để cập nhật sản phẩm.');
  }

  const response = await fetch(`${backendUrl}/api/products/${productId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify(updateData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể cập nhật sản phẩm.');
  }

  return data.data;
}

/**
 * Delete product
 * @param {string} productId
 */
export async function deleteProduct(productId) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để xóa sản phẩm.');
  }

  const response = await fetch(`${backendUrl}/api/products/${productId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể ẩn sản phẩm.');
  }

  return data;
}

/**
 * Get current user's products
 * @param {object} params - { page, limit, status }
 */
export async function getMyProducts(params = {}) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để xem sản phẩm của mình.');
  }

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const response = await fetch(`${backendUrl}/api/products/user/my?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể lấy sản phẩm của bạn.');
  }

  return data.data;
}

/**
 * Upload images
 * @param {FileList|Array} files
 */
export async function uploadImages(files) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để upload hình ảnh.');
  }

  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append('images', file);
  });

  const response = await fetch(`${backendUrl}/api/upload/images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể upload hình ảnh.');
  }

  return data.data;
}