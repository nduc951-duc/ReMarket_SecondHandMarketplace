import { MessageSquareText, Star } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import type { Review } from '@/types/domain';

function formatDate(value?: string | null) {
  return value
    ? new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';
}

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.round(Math.max(0, Math.min(5, rating)));
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} trên 5 sao`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className="size-4 text-warning"
          fill={index < rounded ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

interface ReviewListProps {
  reviews: Review[];
  total: number;
  loading?: boolean;
}

function ReviewList({ reviews, total, loading = false }: ReviewListProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Đánh giá người bán</h2>
        <span className="text-sm text-muted-foreground">{total} đánh giá</span>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
          <MessageSquareText className="size-5 shrink-0" />
          Người bán chưa có đánh giá.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <RatingStars rating={review.rating} />
                <time className="text-xs text-muted-foreground">
                  {formatDate(review.created_at)}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {review.comment || 'Người mua không để lại bình luận.'}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export { ReviewList };
