import React from 'react';
import { formatDateTime, formatDuration } from '../../utils/incidentUtils.js';
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

export default function UnifiedTimeline({ timeline, filterType = 'technical', isCompact = false }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="p-8 text-center text-base-content/50 text-xs font-medium italic">
        No activity history recorded yet.
      </div>
    );
  }

  let renderedHandlingCount = 0;
  
  return (
    <div className={`flex flex-col ${isCompact ? 'px-0 py-1' : 'px-4 py-2'}`}>
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
        const timestamp = item.timestamp || item.pause_start;

        const colorClasses = {
          'CREATE': 'text-error border-error',
          'START': 'text-success border-success',
          'UPDATE': 'text-primary border-primary',
          'PAUSE': 'text-warning border-warning',
          'RESUME': 'text-success border-success',
          'CLOSE': 'text-success border-success',
        };
        const currentColors = colorClasses[action] || 'text-base-content/40 border-base-content/20';

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
          <div key={item.id || idx} className="flex gap-4 relative group">
            {/* Connector Line */}
            {idx !== timeline.length - 1 && (
              <div className="absolute left-[9px] top-6 bottom-[-24px] w-0.5 bg-base-300 opacity-40 z-0" />
            )}

            {/* Icon Circle */}
            <div className={`w-5 h-5 rounded-full bg-base-100 border-2 ${currentColors.split(' ')[1]} flex items-center justify-center z-10 shrink-0 mt-0.5 shadow-sm`}>
              <Icon size={10} className={currentColors.split(' ')[0]} />
            </div>

            {/* Content Area */}
            <div className={`flex-1 min-w-0 ${isCompact ? 'pb-6' : 'pb-8'}`}>
              <div className={`flex justify-between items-start gap-3 ${isCompact ? 'mb-2' : 'mb-3'}`}>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`${isCompact ? 'text-xs' : 'text-sm'} font-bold tracking-tight text-base-content leading-none`}>
                      {getActionLabel()}
                    </span>
                    {item.user_name && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-base-200/50 rounded-full text-xs font-medium text-base-content/70 uppercase tracking-wider leading-none">
                        <User size={8} /> {item.user_name}
                      </span>
                    )}
                  </div>
                  <div className={`${isCompact ? 'text-xs' : 'text-xs'} font-mono font-bold text-base-content/40 mt-1 uppercase tracking-wider`}>
                    {formatDateTime(timestamp)}
                  </div>
                </div>
                {item.segment_duration != null && item.segment_duration > 0 && filterType === 'technical' && (
                  <div className="badge badge-primary badge-soft badge-xs font-semibold text-xs px-1.5 h-5 rounded uppercase tracking-wider flex-shrink-0">
                    {formatDuration(item.segment_duration)}
                  </div>
                )}
              </div>

              {/* Detail Content */}
              <div className={isCompact ? 'mt-1.5' : 'mt-2.5'}>
                {filterType === 'technical' && (cause || actionTxt) && (
                  <div className={`grid grid-cols-1 ${ (cause && actionTxt && !isCompact) ? 'md:grid-cols-2' : ''} gap-2`}>
                    {cause && (
                      <div className="p-3 bg-error/5 rounded-xl">
                        <div className="text-xs font-medium text-error/80 uppercase tracking-wider mb-1">Root Cause</div>
                        <div className={`${isCompact ? 'text-xs' : 'text-sm'} font-bold text-base-content/80 leading-relaxed`}>{cause}</div>
                      </div>
                    )}
                    {actionTxt && (
                      <div className="p-3 bg-success/5 rounded-xl">
                        <div className="text-xs font-medium text-success/80 uppercase tracking-wider mb-1">Action Taken</div>
                        <div className={`${isCompact ? 'text-xs' : 'text-sm'} font-bold text-base-content/80 leading-relaxed`}>{actionTxt}</div>
                      </div>
                    )}
                  </div>
                )}

                {filterType === 'system' && others.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {others.map((o, offsetIdx) => (
                      <span key={offsetIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-base-200/50 rounded-lg text-xs font-semibold text-base-content/70">
                        <div className="w-1 h-1 rounded-full bg-primary/40" />
                        {o}
                      </span>
                    ))}
                  </div>
                )}

                {/* Lifecycle Messages */}
                {((filterType === 'technical' && !cause && !actionTxt && action !== 'UPDATE') || (filterType === 'system' && action === 'CREATE')) && (
                   <div className={`p-3 bg-base-200/40 rounded-xl ${isCompact ? 'text-xs' : 'text-sm'} italic font-bold text-base-content/60 leading-relaxed`}>
                     {action === 'CREATE' ? 'Initial entry: Incident established in the monitoring system.' : (item.details || item.reason || getActionLabel())}
                   </div>
                )}

                {isPause && item.pause_end && filterType === 'technical' && (
                  <div className={`flex items-center gap-2 mt-2 px-2 py-1 bg-success/10 rounded-lg w-fit ${isCompact ? 'text-xs' : 'text-xs'} font-bold text-success uppercase tracking-wider`}>
                    <Play size={10} fill="currentColor" /> Resumed at {formatDateTime(item.pause_end)}
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
