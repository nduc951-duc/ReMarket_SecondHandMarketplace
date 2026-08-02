import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReviewList } from '@/components/product-detail/ReviewList';

describe('product comments', () => {
  it('presents verified buyer feedback as comments about the product', () => {
    render(
      <ReviewList
        total={1}
        reviews={[
          {
            id: 'review-1',
            transaction_id: 'transaction-1',
            product_id: 'product-1',
            reviewer_id: 'buyer-1',
            rating: 5,
            comment: 'Sản phẩm đúng mô tả và còn rất tốt.',
            reviewer_profile: { id: 'buyer-1', full_name: 'Nguyễn An' },
          },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Bình luận về sản phẩm' })).toBeInTheDocument();
    expect(screen.getByText('Nguyễn An')).toBeInTheDocument();
    expect(screen.getByText(/Sản phẩm đúng mô tả/i)).toBeInTheDocument();
  });
});
