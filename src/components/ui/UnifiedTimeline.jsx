import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Edit2,
  Pause,
  Play,
  User,
} from 'lucide-react';
import { formatDateTime, formatDuration } from '../../utils/incidentUtils.js';
import { cn } from '../../lib/utils.js';

const ACTION_ICONS = {
  CREATE: AlertTriangle,
  START: Play,
  UPDATE: Edit2,
  PAUSE: Pause,
  RESUME: Play,
  CLOSE: CheckCircle,
};

const ACTION_STYLES = {
  CREATE: {
    dot: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  START: {
    dot: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  UPDATE: {
    dot: 'border-primary/40 bg-primary/10 text-primary',
    badge: 'bg-primary/10 text-primary',
  },
  PAUSE: {
    dot: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  RESUME: {
    dot: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  CLOSE: {
    dot: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
};

function parseTimelineText(text, action) {
  let cause = '';
  let actionText = '';
  const others = [];

  if (text.includes(' | ')) {
    text.split(' | ').forEach((part) => {
      const clean = part.trim();
      if (!clean) return;

      if (clean.startsWith('Cause:') || clean.startsWith('Penyebab:')) {
        cause = clean.replace(/^Cause:\s*|^Penyebab:\s*/, '').trim();
      } else if (clean.startsWith('Last Action:') || clean.startsWith('Action Terakhir:')) {
        actionText = clean.replace(/^Last Action:\s*|^Action Terakhir:\s*/, '').trim();
      } else {
        others.push(clean);
      }
    });
  } else if (text && action === 'UPDATE') {
    actionText = text;
  }

  return { cause, actionText, others };
}

function getActionLabel(action, isPause, filterType, handlingIndex, hasHandling) {
  if (isPause) return 'Incident Paused';
  if (action === 'UPDATE') {
    if (filterType === 'technical' && hasHandling) return `Handling ${handlingIndex}`;
    return 'System Update';
  }
  if (action === 'START') return 'Action Started';
  if (action === 'RESUME') return 'Action Resumed';
  if (action === 'CREATE') return 'Incident Created';
  if (action === 'CLOSE') return 'Incident Closed';
  return action;
}

export default function UnifiedTimeline({ timeline, filterType = 'technical', isCompact = false }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        No activity history recorded yet.
      </div>
    );
  }

  const preparedTimeline = [];
  let technicalHandlingCount = 0;

  timeline.forEach((item, index) => {
    const isPause = item.type === 'pause';
    const action = isPause ? 'PAUSE' : item.action || 'UPDATE';
    const text = item.details || item.reason || '';
    const parsed = parseTimelineText(text, action);
    const isTechnical = Boolean(
      parsed.cause || parsed.actionText || ['START', 'PAUSE', 'RESUME', 'CLOSE'].includes(action)
    );
    const isSystem = Boolean(parsed.others.length > 0 || action === 'CREATE');

    if (filterType === 'technical' && !isTechnical) return;
    if (filterType === 'system' && !isSystem) return;

    const hasHandling = Boolean(parsed.cause || parsed.actionText);
    const handlingIndex = hasHandling && filterType === 'technical'
      ? (technicalHandlingCount += 1)
      : technicalHandlingCount;

    preparedTimeline.push({
      item,
      index,
      isPause,
      action,
      parsed,
      isTechnical,
      isSystem,
      hasHandling,
      handlingIndex,
    });
  });

  return (
    <div className={cn('space-y-4', isCompact ? 'py-1' : 'py-2')}>
      {preparedTimeline.map(({ item, isPause, action, parsed, hasHandling, handlingIndex }, index) => {
        const Icon = ACTION_ICONS[action] || Activity;
        const { cause, actionText, others } = parsed;
        const timestamp = item.timestamp || item.pause_start;
        const styles = ACTION_STYLES[action] || ACTION_STYLES.UPDATE;
        const actionLabel = getActionLabel(action, isPause, filterType, handlingIndex, hasHandling);
        const lifecycleMessage = action === 'CREATE'
          ? 'Incident established in the monitoring system.'
          : item.details || item.reason || actionLabel;

        return (
          <div key={item.id || index} className="relative pl-8">
            {index !== timeline.length - 1 ? (
              <div className="absolute left-[11px] top-6 bottom-[-18px] w-px bg-border" />
            ) : null}

            <div
              className={cn(
                'absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border',
                styles.dot
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn('font-medium tracking-tight text-foreground', isCompact ? 'text-sm' : 'text-sm')}>
                      {actionLabel}
                    </p>
                    {item.user_name ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {item.user_name}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(timestamp)}</p>
                </div>

                {item.segment_duration != null && item.segment_duration > 0 && filterType === 'technical' ? (
                  <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium', styles.badge)}>
                    {formatDuration(item.segment_duration)}
                  </span>
                ) : null}
              </div>

              {filterType === 'technical' && hasHandling ? (
                <div className={cn('grid gap-2', cause && actionText && !isCompact ? 'md:grid-cols-2' : 'grid-cols-1')}>
                  {cause ? (
                    <div className="rounded-lg border border-border bg-card px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Root Cause
                      </p>
                      <p className={cn('mt-2 leading-6 text-foreground', isCompact ? 'text-sm' : 'text-sm')}>
                        {cause}
                      </p>
                    </div>
                  ) : null}

                  {actionText ? (
                    <div className="rounded-lg border border-border bg-card px-3 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Action Taken
                      </p>
                      <p className={cn('mt-2 leading-6 text-foreground', isCompact ? 'text-sm' : 'text-sm')}>
                        {actionText}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {filterType === 'system' && others.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {others.map((other, otherIndex) => (
                    <span
                      key={otherIndex}
                      className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {other}
                    </span>
                  ))}
                </div>
              ) : null}

              {((filterType === 'technical' && !hasHandling && action !== 'UPDATE') || (filterType === 'system' && action === 'CREATE')) ? (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                  {lifecycleMessage}
                </div>
              ) : null}

              {isPause && item.pause_end && filterType === 'technical' ? (
                <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <Play className="h-3.5 w-3.5" />
                  Resumed at {formatDateTime(item.pause_end)}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
