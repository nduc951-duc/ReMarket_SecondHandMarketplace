import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiRequest, ApiError } from '@/services/apiClient';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiRequest', () => {
  it('unwraps a successful JSON API envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { id: 'product-1' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(apiRequest<{ id: string }>('/api/products/product-1')).resolves.toEqual({
      id: 'product-1',
    });
  });

  it('reports a backend URL/configuration problem when HTML is returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<!DOCTYPE html><html></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      ),
    );

    await expect(apiRequest('/api/products')).rejects.toThrow('VITE_BACKEND_URL');
  });

  it('does not retry a failed mutation request', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/api/payment/create', { method: 'POST' })).rejects.toThrow(
      'Không thể kết nối máy chủ',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserves structured API errors and request IDs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 'CONFLICT', message: 'Đơn hàng đã tồn tại.' } }),
          {
            status: 409,
            headers: { 'content-type': 'application/json', 'x-request-id': 'req-test' },
          },
        ),
      ),
    );

    const error = await apiRequest('/api/transactions', { method: 'POST' }).catch((cause) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'CONFLICT', requestId: 'req-test' });
  });
});
