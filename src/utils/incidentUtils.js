import { SLA_TARGETS } from './constants.js';

// ─── Formatters ───────────────────────────────────────────────────────────────
export function formatDuration(seconds) {
  if (seconds == null || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function elapsedSeconds(startIso) {
  if (!startIso) return 0;
  return Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
}

/**
 * Merges audit_logs and pause_logs into a single sorted timeline.
 * Calculates durations between steps where applicable.
 */
export function processTimeline(incident) {
  if (!incident) return [];

  const parseTime = (s) => {
    if (!s) return 0;
    // Normalize string: handle spaces and missing Z (assume UTC from server)
    let normalized = s;
    if (typeof s === 'string' && !s.includes('Z') && !s.includes('+')) {
      normalized = s.trim().replace(' ', 'T') + 'Z';
    }
    const t = new Date(normalized).getTime();
    return isNaN(t) ? 0 : t;
  };

  const audits = (incident.audit_logs || []).map(l => ({ ...l, type: 'audit', _time: parseTime(l.timestamp) }));
  const pauses = (incident.pause_logs || []).map(l => ({ ...l, type: 'pause', _time: parseTime(l.pause_start) }));
  
  // Unify PAUSE & RESUME entries
  pauses.forEach(p => {
    // Match PAUSE audit log
    const pauseMatch = audits.find(a => 
      !a._unified && a.action === 'PAUSE' && 
      (Math.abs(a._time - p._time) < 10000 || a.details === (p.reason || 'No reason given'))
    );
    if (pauseMatch) {
      p.user_name = pauseMatch.user_name;
      p.user_id = pauseMatch.user_id;
      pauseMatch._unified = true;
    }

    // Match RESUME audit log if pause is ended
    if (p.pause_end) {
      const eTime = parseTime(p.pause_end);
      const resumeMatch = audits.find(a => 
        !a._unified && a.action === 'RESUME' && 
        Math.abs(a._time - eTime) < 10000
      );
      if (resumeMatch) resumeMatch._unified = true;
    }
  });

  const filteredAudits = audits.filter(a => !a._unified);

  // Combine and sort by normalized timestamp
  const raw = [...filteredAudits, ...pauses].sort((a, b) => a._time - b._time);

  // Calculate segments
  const timeline = raw.map((item, idx) => {
    const current = item;
    const next = raw[idx+1];
    let duration = null;

    if (next) {
      duration = Math.floor((next._time - current._time) / 1000);
    } else if (incident.status !== 'done') {
      duration = Math.floor((Date.now() - current._time) / 1000);
    }

    return { ...item, segment_duration: duration };
  });

  return timeline;
}

/**
 * Calculates incident level based on gross duration (hourly buckets).
 * Level 1: 0-1h
 * Level 2: 1h1m - 2h
 * etc.
 */
export function calculateIncidentLevel(startTime, nowOrEndTime) {
  if (!startTime) return 1;
  const start = new Date(startTime).getTime();
  const end = nowOrEndTime ? new Date(nowOrEndTime).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 0) return 1;
  return Math.floor(seconds / 3600) + 1;
}

/**
 * Returns SLA target in seconds based on NCAL.
 */
export function getSLATarget(ncal) {
  return SLA_TARGETS[ncal] || SLA_TARGETS.DEFAULT;
}
