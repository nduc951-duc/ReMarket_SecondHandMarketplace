import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState, type EmptyStateProps } from '@/components/ui/empty-state';

interface ErrorStateProps extends Omit<EmptyStateProps, 'icon' | 'action'> {
  onRetry?: () => void;
  retryLabel?: string;
}

function ErrorState({
  title = 'Không thể tải dữ liệu',
  description,
  onRetry,
  retryLabel = 'Thử lại',
  ...props
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null
      }
      {...props}
    />
  );
}

export { ErrorState, type ErrorStateProps };
