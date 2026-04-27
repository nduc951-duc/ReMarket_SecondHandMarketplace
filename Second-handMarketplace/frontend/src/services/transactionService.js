const DEFAULT_BACKEND_URL = 'http://localhost:4000';

/**
 * Get transactions with pagination and filters
 * @param {object} params - { type, page, limit, status }
 */
export async function getTransactions(params = {}) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để xem giao dịch.');
  }

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const response = await fetch(`${backendUrl}/api/transactions?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể lấy danh sách giao dịch.');
  }

  return data.data;
}

/**
 * Get transaction by ID
 * @param {string} transactionId
 */
export async function getTransactionById(transactionId) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để xem giao dịch.');
  }

  const response = await fetch(`${backendUrl}/api/transactions/${transactionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể lấy thông tin giao dịch.');
  }

  return data.data;
}

/**
 * Create a new transaction/order
 * @param {object} transactionData - { product_id, product_name, product_image, amount, payment_method, note }
 */
export async function createTransaction(transactionData) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để tạo đơn hàng.');
  }

  const response = await fetch(`${backendUrl}/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify(transactionData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tạo đơn hàng.');
  }

  return data.data;
}

/**
 * Update transaction status
 * @param {string} transactionId
 * @param {string} status
 * @param {string} rejection_reason - Optional
 */
export async function updateTransactionStatus(transactionId, status, rejection_reason = '') {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để cập nhật trạng thái.');
  }

  const response = await fetch(`${backendUrl}/api/transactions/${transactionId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify({
      status,
      rejection_reason,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể cập nhật trạng thái.');
  }

  return data.data;
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const { supabase } = await import('../lib/supabaseClient');
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session?.access_token) {
    throw new Error('Bạn cần đăng nhập để xem thống kê.');
  }

  const response = await fetch(`${backendUrl}/api/transactions/stats`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể lấy thống kê giao dịch.');
  }

  return data.data;
}