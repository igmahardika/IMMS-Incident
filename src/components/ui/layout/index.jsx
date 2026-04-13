import React from 'react';
import { cn } from '../../../lib/utils.js';

export function SectionCard({
  title,
  subtitle,
  footer,
  children,
  className = '',
  headerAction,
  padding = true,
}) {
  return (
    <section
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-sm',
        'flex min-h-0 flex-col overflow-hidden',
        className
      )}
    >
      {(title || subtitle || headerAction) ? (
        <div className={cn('flex items-start justify-between gap-4 border-b px-6 py-5', !padding && 'border-b')}>
          <div className="space-y-1">
            {title ? (
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      ) : null}

      <div className={cn('flex min-h-0 flex-1 flex-col', padding && 'p-6')}>
        {children}
      </div>

      {footer ? (
        <div className="border-t bg-muted/30 px-6 py-4">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="flex items-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}
