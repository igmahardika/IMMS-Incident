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

export default function UnifiedTimeline({ timeline, filterType = 'technical' }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        No activity history recorded yet.
      </div>
    );
  }

  let renderedHandlingCount = 0;
  
  return (
    <div className="timeline-container" style={{ padding: '0.5rem 1rem' }}>
      {timeline.map((item, idx) => {
        const isPause = item.type === 'pause';
        const action = isPause ? 'PAUSE' : (item.action || 'UPDATE');
        const text = item.details || item.reason || '';

        // Parsing
        let cause = '';
        let actionTxt = '';
        const others = [];
        if (text.includes(' | ')) {
          const parts = text.split(' | ');
          parts.forEach(p => {
            const cleanP = p.trim();
            if (!cleanP) return;
            if (cleanP.startsWith('Cause:') || cleanP.startsWith('Penyebab:')) {
              cause = cleanP.replace(/^Cause:\s*|^Penyebab:\s*/, '').trim();
            } else if (cleanP.startsWith('Last Action:') || cleanP.startsWith('Action Terakhir:')) {
              actionTxt = cleanP.replace(/^Last Action:\s*|^Action Terakhir:\s*/, '').trim();
            } else {
              others.push(cleanP);
            }
          });
        } else if (text && action === 'UPDATE') {
          actionTxt = text;
        }

        const isTechnical = !!(cause || actionTxt || ['START', 'PAUSE', 'RESUME', 'CLOSE'].includes(action));
        const isSystem = !!(others.length > 0 || ['CREATE'].includes(action));

        // Filtering Logic
        if (filterType === 'technical' && !isTechnical) return null;
        if (filterType === 'system' && !isSystem) return null;

        // Visual setup
        if (filterType === 'technical' && (cause || actionTxt)) renderedHandlingCount++;
        
        const Icon = ACTION_ICONS[action] || Activity;
        const color = ACTION_COLORS[action] || 'var(--text-muted)';
        const timestamp = item.timestamp || item.pause_start;

        const getActionLabel = () => {
          if (isPause) return 'Incident Paused';
          if (action === 'UPDATE') {
             if (filterType === 'technical' && (cause || actionTxt)) return `Handling ${renderedHandlingCount}`;
             return 'System Update';
          }
          if (action === 'START') return 'Action Started';
          if (action === 'RESUME') return 'Action Resumed';
          if (action === 'CREATE') return 'Incident Created';
          if (action === 'CLOSE') return 'Incident Closed';
          return action;
        };

        return (
          <div key={item.id || idx} className="timeline-item" style={{ 
            display: 'flex', 
            gap: '1.25rem', 
            position: 'relative', 
            marginBottom: idx === timeline.length - 1 ? 0 : '1.75rem',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            {/* Connector Line */}
            {idx !== timeline.length - 1 && (
              <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: '-20px', width: '2px', background: 'var(--border)', zIndex: 0, opacity: 0.6 }} />
            )}

            {/* Icon Circle */}
            <div style={{ 
              width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-card)', border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0, marginTop: '2px',
              boxShadow: `0 0 8px ${color}20`
            }}>
              <Icon size={12} style={{ color }} />
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    {getActionLabel()}
                    {item.user_name && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-elevated)', padding: '1px 8px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <User size={10} /> {item.user_name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px', letterSpacing: '-0.01em' }}>
                    {formatDateTime(timestamp)}
                  </div>
                </div>
                {item.segment_duration != null && item.segment_duration > 0 && filterType === 'technical' && (
                  <div style={{ 
                    fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'var(--accent-subtle)', border: '1px solid rgba(99,102,241,0.15)', color: 'var(--accent)',
                    whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    {action === 'PAUSE' ? 'Paused ' : 'Effort '}
                    {formatDuration(item.segment_duration)}
                  </div>
                )}
              </div>

              {/* Detail Content */}
              <div style={{ marginTop: '0.875rem' }}>
                {filterType === 'technical' && (cause || actionTxt) && (
                  <div style={{ display: 'grid', gridTemplateColumns: (cause && actionTxt) ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                    {cause && (
                      <div className="preview-block" style={{ fontSize: '0.8rem', padding: '0.875rem', background: 'rgba(239, 68, 68, 0.03)', borderLeft: '4px solid var(--danger)', borderRadius: '4px 8px 8px 4px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--danger)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>Root Cause</div>
                        <div style={{ lineHeight: 1.6, color: 'var(--text-primary)' }}>{cause}</div>
                      </div>
                    )}
                    {actionTxt && (
                      <div className="preview-block" style={{ fontSize: '0.8rem', padding: '0.875rem', background: 'rgba(34, 197, 94, 0.03)', borderLeft: '4px solid var(--success)', borderRadius: '4px 8px 8px 4px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>Action Taken</div>
                        <div style={{ lineHeight: 1.6, color: 'var(--text-primary)' }}>{actionTxt}</div>
                      </div>
                    )}
                  </div>
                )}

                {filterType === 'system' && others.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                    {others.map((o, idx) => {
                      const isId = o.toLowerCase().includes('id:');
                      const isTech = o.toLowerCase().includes('technician') || o.toLowerCase().includes('teknisi');
                      const isClass = o.toLowerCase().includes('classification') || o.toLowerCase().includes('klasifikasi');
                      
                      let chipColor = 'var(--text-secondary)';
                      let chipBg = 'var(--bg-elevated)';
                      if (isTech) { chipColor = '#6366f1'; chipBg = 'rgba(99,102,241,0.08)'; }
                      if (isClass) { chipColor = '#f59e0b'; chipBg = 'rgba(245,158,11,0.08)'; }

                      return (
                        <span key={idx} style={{ 
                          fontSize: '0.725rem', 
                          fontWeight: 700,
                          padding: '4px 12px', 
                          background: chipBg, 
                          border: `1px solid ${chipColor}20`, 
                          borderRadius: '100px',
                          color: chipColor,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: chipColor }} />
                          {o}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Lifecycle Messages */}
                {((filterType === 'technical' && !cause && !actionTxt && action !== 'UPDATE') || (filterType === 'system' && action === 'CREATE')) && (
                   <div style={{ 
                     fontSize: '0.8rem', 
                     color: 'var(--text-secondary)', 
                     background: 'var(--bg-elevated)', 
                     padding: '0.75rem 1rem', 
                     borderRadius: '8px',
                     border: '1px dashed var(--border)',
                     fontStyle: action === 'CREATE' ? 'normal' : 'italic'
                   }}>
                     {action === 'CREATE' ? 'Initial entry: Incident established in the monitoring system.' : (item.details || item.reason || getActionLabel())}
                   </div>
                )}

                {isPause && item.pause_end && filterType === 'technical' && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700, marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.05)', padding: '4px 10px', borderRadius: '4px', width: 'fit-content' }}>
                    <Play size={12} fill="currentColor" /> Resumed at {formatDateTime(item.pause_end)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
