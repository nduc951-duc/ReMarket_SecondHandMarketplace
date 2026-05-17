const DEFAULT_BACKEND_URL = 'http://localhost:4000';

export async function getCategories() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

  const response = await fetch(`${backendUrl}/api/categories`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể lấy danh mục.');
  }

  return data.data || [];
}
