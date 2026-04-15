import db from '../../db.js';
import { getClosedIncidentView, getIncidentById } from './queries.js';
import { parseOptionalInt } from './utils.js';

export function startIncidentAction(id, userId) {
  const incident = getIncidentById(id);
  if (!incident) {
    const error = new Error('Not found');
    error.status = 404;
    throw error;
  }
  if (incident.start_action_time) {
    const error = new Error('Already started');
    error.status = 400;
    throw error;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE incidents
    SET start_action_time = ?, status = 'progress', updated_at = datetime('now')
    WHERE id = ?
  `).run(now, id);

  db.prepare(`
    INSERT INTO audit_logs (incident_id, user_id, action, details)
    VALUES (?, ?, 'START_ACTION', ?)
  `).run(id, userId, `Action started at ${now}`);

  return getIncidentById(id);
}

export function pauseIncidentAction(id, userId, reason) {
  const incident = getIncidentById(id);
  if (!incident) {
    const error = new Error('Not found');
    error.status = 404;
    throw error;
  }

  const openPause = db.prepare(`
    SELECT * FROM pause_logs WHERE incident_id = ? AND pause_end IS NULL
  `).get(id);

  if (incident.status === 'pending' && openPause) {
    return { ...incident, already_paused: true };
  }

  if (incident.status !== 'progress') {
    const error = new Error('Incident must be in progress to pause');
    error.status = 400;
    throw error;
  }

  if (openPause) {
    return { ...incident, already_paused: true };
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pause_logs (incident_id, pause_start, reason)
    VALUES (?, ?, ?)
  `).run(id, now, reason || null);

  db.prepare(`
    UPDATE incidents
    SET status = 'pending', updated_at = datetime('now')
    WHERE id = ?
  `).run(id);

  db.prepare(`
    INSERT INTO audit_logs (incident_id, user_id, action, details)
    VALUES (?, ?, 'PAUSE', ?)
  `).run(id, userId, reason || 'No reason given');

  return getIncidentById(id);
}

export function resumeIncidentAction(id, userId) {
  const incident = getIncidentById(id);
  if (!incident) {
    const error = new Error('Not found');
    error.status = 404;
    throw error;
  }

  if (incident.status !== 'pending') {
    const error = new Error('Incident is not paused');
    error.status = 400;
    throw error;
  }

  const openPause = db.prepare(`
    SELECT * FROM pause_logs WHERE incident_id = ? AND pause_end IS NULL
  `).get(id);

  if (!openPause) {
    const error = new Error('No open pause log found');
    error.status = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const pauseSec = Math.floor((new Date(now) - new Date(openPause.pause_start)) / 1000);
  const totalPause = (incident.total_pause_duration_seconds || 0) + pauseSec;

  db.prepare(`
    UPDATE pause_logs
    SET pause_end = ?, duration_seconds = ?
    WHERE id = ?
  `).run(now, pauseSec, openPause.id);

  db.prepare(`
    UPDATE incidents
    SET status = 'progress',
        total_pause_duration_seconds = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(totalPause, id);

  db.prepare(`
    INSERT INTO audit_logs (incident_id, user_id, action, details)
    VALUES (?, ?, 'RESUME', ?)
  `).run(id, userId, `Paused for ${pauseSec}s`);

  return getIncidentById(id);
}

export function closeIncidentAction(id, userId, payload = {}) {
  const incident = getIncidentById(id);
  if (!incident) {
    const error = new Error('Not found');
    error.status = 404;
    throw error;
  }

  const normalizedClassificationId = parseOptionalInt(payload.classification_id);
  const now = new Date().toISOString();
  const endT = payload.waktu_online ? new Date(payload.waktu_online) : new Date(now);

  if (Number.isNaN(endT.getTime())) {
    const error = new Error('Invalid online time.');
    error.status = 400;
    throw error;
  }

  const startT = new Date(incident.start_time);
  const grossSec = Math.floor((endT - startT) / 1000);
  const nettSec = Math.max(0, grossSec - incident.total_pause_duration_seconds);

  db.prepare(`
    UPDATE incidents SET
      status = 'done',
      end_time = ?,
      duration_gross_seconds = ?,
      duration_nett_seconds = ?,
      root_cause = COALESCE(?, root_cause),
      last_action = COALESCE(?, last_action),
      classification_id = COALESCE(?, classification_id),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    endT.toISOString(),
    grossSec,
    nettSec,
    payload.root_cause || null,
    payload.last_action || null,
    normalizedClassificationId,
    id
  );

  db.prepare(`
    INSERT INTO audit_logs (incident_id, user_id, action, details)
    VALUES (?, ?, 'CLOSE', ?)
  `).run(id, userId, `Closed. Gross: ${grossSec}s, Nett: ${nettSec}s`);

  return {
    incident: getClosedIncidentView(id),
    grossSec,
    nettSec,
  };
}
