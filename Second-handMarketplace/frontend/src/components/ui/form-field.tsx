import { cloneElement, useId, type ReactElement } from 'react';

import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
  children: ReactElement<{
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }>;
}

function FormField({
  label,
  htmlFor,
  required = false,
  description,
  error,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = htmlFor ?? generatedId;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  const control = cloneElement(children, {
    id: children.props.id ?? controlId,
    'aria-describedby': children.props['aria-describedby'] ?? describedBy,
    'aria-invalid': children.props['aria-invalid'] ?? Boolean(error),
  });

  return (
    <div data-slot="form-field" className={cn('space-y-2', className)}>
      <label htmlFor={controlId} className="text-sm font-semibold text-foreground">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        )}
      </label>
      {control}
      {description && !error && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField, type FormFieldProps };
