import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

const buttonBaseClasses = [
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
  'text-sm font-medium transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'ring-offset-background disabled:pointer-events-none disabled:opacity-50',
].join(' ');

const buttonVariants = {
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
};

const buttonSizes = {
  xs: 'h-8 rounded-md px-2.5 text-xs',
  sm: 'h-8 rounded-md px-3 text-sm',
  md: 'h-9 px-4 py-2 text-sm',
  lg: 'h-10 rounded-md px-8 text-sm',
  icon: 'h-9 w-9',
};

function getButtonVariant(variant, outline) {
  if (outline) return buttonVariants.outline;
  return buttonVariants[variant] || buttonVariants.default;
}

export function Button({
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
}) {
  const resolvedSize = buttonSizes[size] || buttonSizes.md;
  const resolvedVariant = getButtonVariant(variant, outline);

  return (
    <button
      type={type}
      className={cn(buttonBaseClasses, resolvedVariant, resolvedSize, className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export function FormField({ label, error, children, className, htmlFor, description }) {
  return (
    <div className={cn('grid w-full gap-2', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium leading-none text-foreground"
        >
          {label}
        </label>
      ) : null}
      {children}
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef(function Input(
  {
    label,
    error,
    type = 'text',
    className = '',
    wrapperClassName,
    description,
    id,
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
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm',
          'transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
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
      <textarea
        ref={ref}
        id={id}
        className={cn(
          'flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
          'placeholder:text-muted-foreground transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
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
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm',
          'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </FormField>
  );
});
