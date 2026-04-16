import React from 'react';
import { Loader2, PackageOpen } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../dialog.jsx';

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = '',
  bodyClassName = '',
  footerClassName = '',
  closeOnOverlay = true,
}) {
  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className={cn('max-h-[92vh] w-[calc(100vw-32px)] p-0', sizeMap[size] || 'max-w-lg')}
        onEscapeKeyDown={(event) => {
          if (!closeOnOverlay) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (!closeOnOverlay) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (!closeOnOverlay) event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 border-b border-border pb-4">
          <DialogTitle>{title}</DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
        </DialogHeader>

        <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 pb-6', bodyClassName)}>{children}</div>

        {footer ? <DialogFooter className={footerClassName}>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

export function EmptyState({ icon, title, desc, action, compact = false, className = '' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 px-6 py-12 text-center', compact ? 'min-h-[200px]' : 'min-h-[280px]', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
        {icon || <PackageOpen className="h-6 w-6" />}
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {desc ? <p className="max-w-md text-sm leading-6 text-muted-foreground">{desc}</p> : null}
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
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        {headerWidths.map((widthClass, index) => (
          <div key={index} className={cn('h-4 animate-pulse rounded-md bg-muted', widthClass)} />
        ))}
      </div>

      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-3 px-4 py-3">
            {cellWidths.map((widthClass, cellIndex) => (
              <div
                key={cellIndex}
                className={cn('h-4 animate-pulse rounded-md bg-muted/80', widthClass, cellIndex === 2 && 'w-48')}
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
    <div className="w-full rounded-xl border border-border bg-card p-6">
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
