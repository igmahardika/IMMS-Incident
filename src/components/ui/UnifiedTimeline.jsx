import React from 'react';
import { formatDateTime, formatDuration } from '../../utils/api.js';
import { Clock, Pause, Play, Edit2, CheckCircle, AlertTriangle, User, Activity } from 'lucide-react';

const ACTION_ICONS = {
  'CREATE': AlertTriangle,
  'START': Play,
  'UPDATE': Edit2,
  'PAUSE': Pause,
  'RESUME': Play,
  'CLOSE': CheckCircle,
};

const ACTION_COLORS = {
  'CREATE': 'var(--danger)',
  'START': 'var(--success)',
  'UPDATE': 'var(--accent)',
  'PAUSE': 'var(--warning)',
  'RESUME': 'var(--success)',
  'CLOSE': 'var(--success)',
};

export default function UnifiedTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        No activity history recorded yet.
      </div>
    );
  }

  let handlingCount = 0;
  return (
    <div className="timeline-container" style={{ padding: '1rem' }}>
      {timeline.map((item, idx) => {
        const isPause = item.type === 'pause';
        const action = isPause ? 'PAUSE' : (item.action || 'UPDATE');
        if (action === 'UPDATE') handlingCount++;
        
        const Icon = ACTION_ICONS[action] || Activity;
        const color = ACTION_COLORS[action] || 'var(--text-muted)';
        const timestamp = item.timestamp || item.pause_start;

        const getActionLabel = () => {
          if (isPause) return 'Incident Paused';
          if (action === 'UPDATE') return `Handling ${handlingCount}`;
          if (action === 'START') return 'Action Started';
          if (action === 'RESUME') return 'Action Resumed';
          if (action === 'CREATE') return 'Incident Created';
          if (action === 'CLOSE') return 'Incident Closed';
          return action;
        };

        return (
          <div key={item.id || idx} className="timeline-item" style={{ display: 'flex', gap: '1rem', position: 'relative', marginBottom: idx === timeline.length - 1 ? 0 : '1.5rem' }}>
            {/* Connector Line */}
            {idx !== timeline.length - 1 && (
              <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: '-16px', width: '2px', background: 'var(--border)', zIndex: 0 }} />
            )}

            {/* Icon */}
            <div style={{ 
              width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-elevated)', border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0, marginTop: '2px'
            }}>
              <Icon size={12} style={{ color }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getActionLabel()}
                    {item.user_name && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <User size={10} /> {item.user_name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                    {formatDateTime(timestamp)}
                  </div>
                </div>
                {item.segment_duration != null && item.segment_duration > 0 && (
                  <div style={{ 
                    fontSize: '0.68rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap'
                  }}>
                    {action === 'PAUSE' ? 'Paused for ' : 'Handled for '}
                    {formatDuration(item.segment_duration)}
                  </div>
                )}
              </div>

              {/* Details / Reason */}
              {(item.details || item.reason) && (
                <div className="preview-block" style={{ marginTop: '0.5rem', padding: '0.625rem', fontSize: '0.8rem', color: 'var(--text-secondary)', minHeight: 'auto', background: isPause ? 'rgba(251,191,36,0.05)' : undefined }}>
                   {item.details || item.reason}
                </div>
              )}
              
              {isPause && item.pause_end && (
                <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Play size={10} /> Resumed at {formatDateTime(item.pause_end)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
