import React from 'react';
import { cn } from '../../lib/utils.js';

export function DropdownSurface({ children, className = '' }) {
  return (
    <div
      className={cn(
        'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[80] rounded-lg border border-border bg-popover p-2 shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
}
