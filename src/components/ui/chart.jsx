import React from 'react';
import { Tooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';

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
    <div className={`chart-container ${className || ''}`} style={chartStyle}>
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
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {payload.map((item, idx) => {
          const cfg = config[item.dataKey] || config[item.name] || {};
          const label = cfg.label || item.name || item.dataKey;
          const color = cfg.color || item.color || item.fill;

          return (
            <div key={idx} className="chart-tooltip-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="chart-tooltip-indicator" style={{ background: color }} />
                <span className="chart-tooltip-key">{label}</span>
              </div>
              <span className="chart-tooltip-value">
                {valueFormatter
                  ? valueFormatter(item.value, item.name, item)
                  : typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                {item.unit && !valueFormatter && <span style={{ marginLeft: 2, fontSize: '0.65rem', opacity: 0.7 }}>{item.unit}</span>}
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
    <div className="chart-legend">
      {payload.map((entry, idx) => {
        const key = entry.dataKey || entry.value;
        const cfg = config[key] || {};
        const label = cfg.label || entry.value || key;
        const color = cfg.color || entry.color;

        return (
          <div key={idx} className="chart-legend-item">
            <div className="chart-legend-indicator" style={{ background: color }} />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export { ResponsiveContainer };
