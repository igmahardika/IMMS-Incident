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
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  titleClassName = '',
  subtitleClassName = '',
}) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        className
      )}
    >
      {title || subtitle || headerAction ? (
        <div className={cn('flex items-start justify-between gap-4 border-b border-border px-4 py-4 md:px-6 md:py-5', headerClassName)}>
          <div className="space-y-1">
            {title ? <h2 className={cn('text-lg font-semibold tracking-tight text-foreground', titleClassName)}>{title}</h2> : null}
            {subtitle ? <p className={cn('text-sm text-muted-foreground', subtitleClassName)}>{subtitle}</p> : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      ) : null}

      <div className={cn('flex min-h-0 flex-1 flex-col', padding && 'p-4 md:p-6', bodyClassName)}>
        {children}
      </div>

      {footer ? <div className={cn('border-t border-border bg-muted/30 px-4 py-4 md:px-6', footerClassName)}>{footer}</div> : null}
    </section>
  );
}

export function PageHeader({ title, subtitle, action, eyebrow, className = '', actionClassName = '' }) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-start md:justify-between', className)}>
      <div className="space-y-1.5">
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>

      {action ? <div className={cn('flex flex-wrap items-center gap-2', actionClassName)}>{action}</div> : null}
    </div>
  );
}
