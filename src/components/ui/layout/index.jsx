import React from 'react';
import { cn } from '../../../lib/utils.js';

export function SectionCard({ title, subtitle, footer, children, className = '', headerAction, style, padding = true }) {
  return (
    <div className={cn("bg-background border border-foreground/[0.06] shadow-sm rounded-xl overflow-hidden flex flex-col min-h-0", className)} style={style}>
      <div className={cn("flex flex-col flex-1 min-h-0", padding ? "p-4 md:p-5" : "")}>
        {(title || headerAction) && (
          <div className={cn("flex items-center justify-between mb-4 shrink-0", !padding && "px-4 pt-4")}>
            <div className="flex flex-col gap-0.5">
              {title && <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/40 leading-none">{title}</h2>}
              {subtitle && <p className="text-[10px] font-medium text-foreground/30 leading-snug">{subtitle}</p>}
            </div>
            {headerAction}
          </div>
        )}
        {children}
      </div>
      {footer && (
        <div className={cn(
          "px-4 py-3 border-t border-foreground/5 bg-foreground/[0.02] mt-auto flex justify-end",
          padding && "mx-4 mb-4 rounded-xl border border-transparent bg-muted/50"
        )}>
          {footer}
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap shrink-0 mb-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-black tracking-tight text-foreground/90 uppercase">{title}</h1>
        {subtitle && <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 leading-none">{subtitle}</p>}
      </div>
      {action && (
        <div className="flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
