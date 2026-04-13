import React, { useEffect } from 'react';
import { Loader2, PackageOpen, X } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

export function Modal({ open, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return;

    const handler = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog backdrop"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border bg-background shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
          sizeMap[size] || 'max-w-lg'
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-foreground">
              {title}
            </h3>
          </div>

          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {footer ? (
          <div className="flex justify-end gap-2 border-t bg-muted/30 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted/40 text-muted-foreground">
        {icon || <PackageOpen className="h-6 w-6" />}
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {desc ? (
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            {desc}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function Spinner({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className={cn('animate-spin text-primary', sizeMap[size] || sizeMap.md, className)} />
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export function TableSkeleton({ rows = 8 }) {
  const headerWidths = ['w-16', 'w-24', 'w-40', 'w-20', 'w-24', 'w-32'];
  const cellWidths = ['w-14', 'w-28', 'w-36', 'w-20', 'w-24', 'w-28'];

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {headerWidths.map((widthClass, index) => (
          <div
            key={index}
            className={cn('h-4 animate-pulse rounded-md bg-muted', widthClass)}
          />
        ))}
      </div>

      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-3 px-4 py-3">
            {cellWidths.map((widthClass, cellIndex) => (
              <div
                key={cellIndex}
                className={cn(
                  'h-4 animate-pulse rounded-md bg-muted/80',
                  widthClass,
                  cellIndex === 2 && 'w-48'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="w-full rounded-xl border bg-card p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-xl bg-muted" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-40 animate-pulse rounded-md bg-muted/80" />
        </div>
      </div>
    </div>
  );
}
