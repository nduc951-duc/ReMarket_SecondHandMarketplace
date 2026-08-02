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
        <div>
          <h2 className="text-lg font-semibold">Bình luận về sản phẩm</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Chỉ người mua đã hoàn tất giao dịch mới có thể bình luận.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{total} bình luận</span>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
          <MessageSquareText className="size-5 shrink-0" />
          Sản phẩm này chưa có bình luận từ người mua.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {review.reviewer_profile?.avatar_url ? (
                    <img
                      src={review.reviewer_profile.avatar_url}
                      alt=""
                      width="36"
                      height="36"
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-full bg-muted text-xs font-semibold">
                      {(review.reviewer_profile?.full_name || 'N').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold">
                      {review.reviewer_profile?.full_name || 'Người mua đã xác minh'}
                    </p>
                    <RatingStars rating={review.rating} />
                  </div>
                </div>
                <time className="text-xs text-muted-foreground">
                  {formatDate(review.created_at)}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {review.comment || 'Người mua chỉ để lại điểm đánh giá cho sản phẩm.'}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export { ReviewList };
