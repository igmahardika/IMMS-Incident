import React, { useEffect, useState } from 'react';

import { cn } from '../../lib/utils.js';
import {
  calculateIncidentLevel,
  formatDateTime,
  formatDuration,
  getIncidentDisplayName,
  getSLATarget,
} from '../../utils/incidentUtils.js';
import {
  DurationBadge,
  LevelBadge,
  LiveTimer,
  NcalBadge,
  StatusPill,
} from '../../components/ui/index.jsx';

export default function IncidentSummaryCard({ incident }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const targetSeconds = getSLATarget(incident.ncal);
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(incident.start_time).getTime()) / 1000)
  );
  const percentUsed = Math.min(100, Math.max(0, Math.round((elapsedSeconds / targetSeconds) * 100)));
  const isDanger = percentUsed >= 80;

  return (
    <div className="space-y-5 rounded-xl border bg-muted/20 p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <NcalBadge value={incident.ncal} />
          <StatusPill status={incident.status} />
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{getIncidentDisplayName(incident)}</p>
          <p className="mt-1 font-mono text-xs text-primary">{incident.case_no}</p>
        </div>
      </div>

      <div className="grid items-stretch gap-6 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">SLA Level</p>
          <LevelBadge level={calculateIncidentLevel(incident.start_time)} targetHours={targetSeconds / 3600} />
        </div>

        <div className="space-y-2 rounded-lg border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Net Duration</p>
          <DurationBadge
            seconds={Math.max(0, elapsedSeconds - (incident.total_pause_duration_seconds || 0))}
            target={targetSeconds}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">SLA Consumption</p>
          <span className={cn('text-xs font-medium', isDanger ? 'text-destructive' : 'text-primary')}>
            {percentUsed}%
          </span>
        </div>

        <progress
          className={cn(
            'h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted',
            isDanger
              ? '[&::-moz-progress-bar]:bg-destructive [&::-webkit-progress-value]:bg-destructive'
              : '[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary'
          )}
          max={100}
          value={percentUsed}
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDuration(targetSeconds)} target</span>
          <span>{formatDateTime(incident.start_time)}</span>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border bg-background p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Current Timer</p>
        <div className="font-mono text-lg font-semibold tracking-tight text-foreground">
          <LiveTimer
            startIso={incident.start_time}
            pausedSec={incident.total_pause_duration_seconds}
            paused={incident.status === 'pending'}
            target={targetSeconds}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border bg-background p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Initial Problem</p>
        <p className="text-sm leading-6 text-foreground">{incident.initial_problem || 'No description provided.'}</p>
      </div>
    </div>
  );
}
