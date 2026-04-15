import React from 'react';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        error: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        warning: 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50',
        success: 'border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50',
        info: 'border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200 dark:hover:bg-sky-950/50',
        neutral: 'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        xs: 'h-8 rounded-md px-2.5 text-xs',
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const controlVariants = cva(
  cn(
    'flex w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-[color,box-shadow,border-color]',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-50'
  ),
  {
    variants: {
      size: {
        sm: 'h-8 text-xs',
        md: 'h-9 text-sm',
        lg: 'h-10 text-sm',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export function FormField({
  label,
  error,
  children,
  className,
  htmlFor,
  description,
  labelClassName,
  contentClassName,
  descriptionClassName,
  errorClassName,
}) {
  return (
    <div className={cn('grid w-full gap-2', className)}>
      {label ? (
        <label htmlFor={htmlFor} className={cn('text-sm font-medium leading-none text-foreground', labelClassName)}>
          {label}
        </label>
      ) : null}
      <div className={cn('min-w-0', contentClassName)}>{children}</div>
      {description ? <p className={cn('text-sm text-muted-foreground', descriptionClassName)}>{description}</p> : null}
      {error ? <p className={cn('text-sm font-medium text-destructive', errorClassName)}>{error}</p> : null}
    </div>
  );
}

export const Button = React.forwardRef(function Button(
  {
    children,
    variant = 'default',
    size = 'md',
    outline = false,
    icon,
    isLoading = false,
    className = '',
    disabled,
    type = 'button',
    ...props
  },
  ref
) {
  const resolvedVariant = outline ? 'outline' : variant;

  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant: resolvedVariant, size }), className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});

export const Input = React.forwardRef(function Input(
  {
    label,
    error,
    type = 'text',
    className = '',
    wrapperClassName,
    description,
    id,
    size = 'md',
    ...props
  },
  ref
) {
  return (
    <FormField
      label={label}
      error={error}
      className={wrapperClassName}
      htmlFor={id}
      description={description}
    >
      <input
        ref={ref}
        id={id}
        type={type}
        className={cn(
          controlVariants({ size }),
          'py-1',
          error && 'border-destructive focus-visible:ring-destructive/30',
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </FormField>
  );
});

export const Textarea = React.forwardRef(function Textarea(
  {
    label,
    error,
    className = '',
    wrapperClassName,
    description,
    id,
    size = 'md',
    ...props
  },
  ref
) {
    const textareaSizeClass = {
      sm: 'min-h-[96px]',
      md: 'min-h-[120px]',
      lg: 'min-h-[156px]',
    };

    return (
      <FormField
        label={label}
        error={error}
        className={wrapperClassName}
        htmlFor={id}
        description={description}
      >
        <textarea
          ref={ref}
          id={id}
          className={cn(
            controlVariants({ size }),
            'h-auto resize-none py-2',
            textareaSizeClass[size] || textareaSizeClass.md,
            error && 'border-destructive focus-visible:ring-destructive/30',
            className
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
      </FormField>
    );
});

export const Select = React.forwardRef(function Select(
  {
    label,
    error,
    className = '',
    children,
    wrapperClassName,
    description,
    id,
    size = 'md',
    ...props
  },
  ref
) {
  return (
    <FormField
      label={label}
      error={error}
      className={wrapperClassName}
      htmlFor={id}
      description={description}
    >
      <select
        ref={ref}
        id={id}
        className={cn(
          controlVariants({ size }),
          'py-1',
          error && 'border-destructive focus-visible:ring-destructive/30',
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
    </FormField>
  );
});
