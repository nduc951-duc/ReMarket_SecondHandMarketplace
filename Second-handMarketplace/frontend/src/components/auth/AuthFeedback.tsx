import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export type FeedbackTone = 'success' | 'error';

interface AuthFeedbackProps {
  tone: FeedbackTone;
  message: string;
}

function AuthFeedback({ tone, message }: AuthFeedbackProps) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3 text-sm',
        tone === 'success'
          ? 'border-success/25 bg-success/10 text-success'
          : 'border-destructive/25 bg-destructive/10 text-destructive',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

export { AuthFeedback };
