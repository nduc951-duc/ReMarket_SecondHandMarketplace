import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AiSupportWidget from '@/components/ai/AiSupportWidget';
import { askAiSupport } from '@/services/aiSupportService';

vi.mock('@/services/aiSupportService', () => ({
  askAiSupport: vi.fn(),
}));

describe('AiSupportWidget', () => {
  beforeEach(() => {
    vi.mocked(askAiSupport).mockResolvedValue({
      answer: 'Bạn có thể thanh toán trong 15 phút. [D1]',
      sources: [
        {
          id: 'D1',
          sourceKey: 'payment-window',
          title: 'Payment policy',
          excerpt: 'Giao dịch chờ thanh toán có hiệu lực trong 15 phút.',
        },
      ],
      retrieval: {
        mode: 'hybrid_vector',
        model: 'text-embedding-3-small',
        version: 1,
      },
    });
  });

  it('renders grounded sources and the hybrid retrieval status', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AiSupportWidget />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    const input = screen.getByPlaceholderText(/camera/i);
    fireEvent.change(input, { target: { value: 'Tôi có bao lâu để thanh toán?' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(askAiSupport).toHaveBeenCalledWith('Tôi có bao lâu để thanh toán?'));
    expect(await screen.findByText('[D1] Payment policy')).toBeInTheDocument();
    expect(screen.getByText(/Hybrid search/)).toBeInTheDocument();
  });
});
