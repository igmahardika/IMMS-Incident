import React from 'react';
import { Tooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils.js';

/**
 * ChartContainer provides a wrapper for Recharts that can handle custom 
 * configuration for labels and colors.
 */
export function ChartContainer({ config = {}, children, className, style }) {
  // Inject CSS variables for colors if provided
  const chartStyle = React.useMemo(() => {
    const vars = {};
    Object.entries(config).forEach(([key, value]) => {
      if (value.color) {
        vars[`--color-${key}`] = value.color;
      }
    });
    return { 
      minHeight: 0,
      minWidth: 0,
      ...style, 
      ...vars 
    };
  }, [config, style]);

  return (
    <div className={cn("chart-container w-full h-full relative", className)} style={chartStyle}>
      {children}
    </div>
  );
}

/**
 * Custom Tooltip component following shadcn/ui aesthetics
 */
export function ChartTooltip({ active, payload, label, config = {}, valueFormatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border border-foreground/10 shadow-2xl rounded-xl p-4 min-w-[140px] backdrop-blur-md">
      <div className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-3 border-b border-foreground/5 pb-2">{label}</div>
      <div className="flex flex-col gap-2.5">
        {payload.map((item, idx) => {
          const cfg = config[item.dataKey] || config[item.name] || {};
          const lbl = cfg.label || item.name || item.dataKey;
          const color = cfg.color || item.color || item.fill;

          return (
            <div key={idx} className="flex items-center justify-between gap-6 text-[11px] font-bold">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-sm shrink-0 shadow-sm" style={{ background: color }} />
                <span className="text-foreground/40 uppercase tracking-[0.1em]">{lbl}</span>
              </div>
              <span className="font-mono text-foreground tabular-nums">
                {valueFormatter
                  ? valueFormatter(item.value, item.name, item)
                  : typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                {item.unit && !valueFormatter && <span className="ml-0.5 text-[10px] opacity-70 tracking-tighter">{item.unit}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Custom Legend component following shadcn/ui aesthetics
 */
export function ChartLegend({ payload, config = {} }) {
  if (!payload || !payload.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mt-4 px-4 py-2.5 bg-foreground/[0.03] rounded-xl border border-foreground/5 shadow-sm">
      {payload.map((entry, idx) => {
        const key = entry.dataKey || entry.value;
        const cfg = config[key] || {};
        const lbl = cfg.label || entry.value || key;
        const color = cfg.color || entry.color;

        return (
          <div key={idx} className="flex items-center gap-2.5 transition-all hover:text-foreground">
            <div className="w-1.5 h-1.5 rounded-sm shrink-0 shadow-xs" style={{ background: color }} />
            <span>{lbl}</span>
          </div>
        );
      })}
    </div>
  );
}

export { ResponsiveContainer };
