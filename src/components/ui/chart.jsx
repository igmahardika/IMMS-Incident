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

    const hasExplicitHeight =
      Boolean(style?.height) ||
      /\bh-\[|\bh-\d+|\bmin-h-\[|\bmin-h-\d+/.test(className || '');

    return {
      minHeight: hasExplicitHeight ? undefined : '300px',
      height: '100%',
      ...style,
      ...vars,
    };
  }, [config, style, className]);

  return (
    <div className={cn('chart-container relative w-full min-w-0', className)} style={chartStyle}>
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
export function ChartTooltipContent({
  active,
  payload,
  label,
  config = {},
  indicator = "dot",
  labelFormatter,
  valueFormatter,
}) {
  if (!active || !payload || !payload.length) return null;

  const formattedLabel = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div className="min-w-[180px] rounded-xl border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-lg">
      <div className="mb-2 border-b border-border/60 pb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {formattedLabel}
      </div>
      <div className="flex flex-col gap-2">
        {payload.map((item, idx) => {
          const cfg = config[item.dataKey] || config[item.name] || {};
          const lbl = cfg.label || item.name || item.dataKey;
          const color = cfg.color || item.color || item.fill;

          return (
            <div key={idx} className="flex items-center justify-between gap-5 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                {indicator === "dot" && (
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                )}
                <span className="truncate font-medium text-muted-foreground">{lbl}</span>
              </div>
              <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                {valueFormatter
                  ? valueFormatter(item.value, item.dataKey, item.payload, item)
                  : typeof item.value === 'number'
                    ? item.value.toLocaleString()
                    : item.value}
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
    <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
      {payload.map((entry, idx) => {
        const key = entry.dataKey || entry.value;
        const cfg = config[key] || {};
        const lbl = cfg.label || entry.value || key;
        const color = cfg.color || entry.color;

        return (
          <div key={idx} className="flex cursor-default items-center gap-2 transition-colors hover:text-foreground">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
            <span className="font-medium">{lbl}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ResponsiveContainer(props) {
  const wrapperRef = React.useRef(null);
  const [bounds, setBounds] = React.useState({ width: 0, height: 0 });
  const { width: _width, height: _height, ...restProps } = props;

  React.useLayoutEffect(() => {
    const element = wrapperRef.current;
    if (!element) return undefined;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const nextWidth = Math.round(rect.width || element.clientWidth || 0);
      const nextHeight = Math.round(rect.height || element.clientHeight || 0);
      setBounds((previous) => (
        previous.width === nextWidth && previous.height === nextHeight
          ? previous
          : { width: nextWidth, height: nextHeight }
      ));
    };

    const frame = window.requestAnimationFrame(updateSize);

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="h-full min-h-[240px] w-full min-w-0">
      {bounds.width > 0 && bounds.height > 0 ? (
        <RechartsResponsiveContainer minWidth={0} width={bounds.width} height={bounds.height} {...restProps} />
      ) : null}
    </div>
  );
}
