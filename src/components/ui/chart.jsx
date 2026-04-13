import React from 'react';
import {
  Tooltip,
  Legend as RechartsLegend,
  ResponsiveContainer as RechartsResponsiveContainer,
} from 'recharts';
import { cn } from '../../lib/utils.js';

/**
 * ChartContainer provides a wrapper for Recharts that can handle custom 
 * configuration for labels and colors from an external config object.
 */
export function ChartContainer({ config = {}, children, className, style }) {
  const chartStyle = React.useMemo(() => {
    const vars = {};
    Object.entries(config).forEach(([key, value]) => {
      if (value.color) {
        vars[`--color-${key}`] = value.color;
      }
    });

    // Ensure a fallback height if neither style nor specific h- class is dominant
    return { 
      minHeight: style?.height || className?.includes('p-') ? undefined : '300px',
      height: '100%',
      ...style, 
      ...vars 
    };
  }, [config, style, className]);

  return (
    <div className={cn("chart-container relative w-full min-w-0", className)} style={chartStyle}>
      {children}
    </div>
  );
}

/**
 * ChartTooltip is a wrapper for Recharts Tooltip
 */
export const ChartTooltip = Tooltip;

/**
 * ChartTooltipContent following the Shadcn UI reference style
 */
export function ChartTooltipContent({ active, payload, label, config = {}, indicator = "dot", labelFormatter }) {
  if (!active || !payload || !payload.length) return null;

  const formattedLabel = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div className="bg-background border border-foreground/8 shadow-2xl rounded-xl p-3 min-w-[150px] backdrop-blur-md">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-3 border-b border-foreground/[0.04] pb-2">
        {formattedLabel}
      </div>
      <div className="flex flex-col gap-2.5">
        {payload.map((item, idx) => {
          const cfg = config[item.dataKey] || config[item.name] || {};
          const lbl = cfg.label || item.name || item.dataKey;
          const color = cfg.color || item.color || item.fill;

          return (
            <div key={idx} className="flex items-center justify-between gap-6 text-[10px] font-black">
              <div className="flex items-center gap-2">
                {indicator === "dot" && (
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                )}
                <span className="text-foreground/50 uppercase tracking-widest">{lbl}</span>
              </div>
              <span className="font-mono text-foreground tabular-nums">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ChartLegend is a wrapper for Recharts Legend
 */
export const ChartLegend = RechartsLegend;

/**
 * ChartLegendContent following the Shadcn UI reference style
 */
export function ChartLegendContent({ payload, config = {} }) {
  if (!payload || !payload.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-black uppercase tracking-[0.25em] text-foreground/30 mt-6 pt-5 border-t border-foreground/[0.04] w-full">
      {payload.map((entry, idx) => {
        const key = entry.dataKey || entry.value;
        const cfg = config[key] || {};
        const lbl = cfg.label || entry.value || key;
        const color = cfg.color || entry.color;

        return (
          <div key={idx} className="flex items-center gap-2.5 transition-all hover:text-foreground/60 cursor-default">
            <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ background: color }} />
            <span>{lbl}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ResponsiveContainer(props) {
  return <RechartsResponsiveContainer minWidth={0} {...props} />;
}
