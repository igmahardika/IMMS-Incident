import db from '../../db.js';

export function getIncidentIntegritySummary() {
  const overview = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count,
      SUM(CASE WHEN status = 'progress' THEN 1 ELSE 0 END) AS progress_count,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_count
    FROM incidents
  `).get();

  const pendingWithoutOpenPause = db.prepare(`
    SELECT i.id, i.case_no, i.ncal, i.start_time
    FROM incidents i
    WHERE i.status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM pause_logs p
        WHERE p.incident_id = i.id
          AND p.pause_end IS NULL
      )
    ORDER BY i.start_time DESC
  `).all();

  const openPauseWithoutPending = db.prepare(`
    SELECT i.id, i.case_no, i.status, p.pause_start
    FROM incidents i
    JOIN pause_logs p ON p.incident_id = i.id
    WHERE p.pause_end IS NULL
      AND i.status != 'pending'
    ORDER BY p.pause_start DESC
  `).all();

  const doneWithOpenPause = db.prepare(`
    SELECT i.id, i.case_no, p.pause_start
    FROM incidents i
    JOIN pause_logs p ON p.incident_id = i.id
    WHERE i.status = 'done'
      AND p.pause_end IS NULL
    ORDER BY i.end_time DESC
  `).all();

  return {
    summary: {
      open: Number(overview.open_count || 0),
      progress: Number(overview.progress_count || 0),
      pending: Number(overview.pending_count || 0),
      done: Number(overview.done_count || 0),
      pendingWithoutOpenPause: pendingWithoutOpenPause.length,
      openPauseWithoutPending: openPauseWithoutPending.length,
      doneWithOpenPause: doneWithOpenPause.length,
    },
    samples: {
      pendingWithoutOpenPause: pendingWithoutOpenPause.slice(0, 10),
      openPauseWithoutPending: openPauseWithoutPending.slice(0, 10),
      doneWithOpenPause: doneWithOpenPause.slice(0, 10),
    },
  };
}
