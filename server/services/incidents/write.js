import db from '../../db.js';
import { getIncidentById, getIncidentWithCustomerLite } from './queries.js';

export function createIncident(payload, userId) {
  const {
    customer_id,
    ncal,
    odp_bts,
    level_support,
    initial_problem,
    power_before,
    indikasi,
    kabel,
    panjang_kabel,
    pic,
    case_no,
    start_time,
    sla,
    customer_terdampak,
    koordinat,
    technician_id,
  } = payload;

  if (!case_no || !case_no.trim()) {
    const error = new Error('Nomor Case wajib diisi!');
    error.status = 400;
    throw error;
  }

  const newStartTime = start_time || new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO incidents (
      case_no, customer_id, ncal, odp_bts, level_support, initial_problem, power_before,
      indikasi, kabel, panjang_kabel, pic, customer_terdampak, koordinat, status,
      start_time, created_by, updated_at, sla, technician_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, datetime('now'), ?, ?)
  `).run(
    case_no.trim(),
    customer_id || null,
    ncal || 'YELLOW',
    odp_bts || null,
    level_support || null,
    initial_problem || null,
    power_before || null,
    indikasi || null,
    kabel || null,
    panjang_kabel || null,
    pic || null,
    customer_terdampak || null,
    koordinat || null,
    newStartTime,
    userId,
    sla || null,
    technician_id || null
  );

  const incident = getIncidentWithCustomerLite(result.lastInsertRowid);
  if (!incident) {
    throw new Error('Failed to retrieve newly created incident.');
  }

  db.prepare(`
    INSERT INTO audit_logs (incident_id, user_id, action, details)
    VALUES (?, ?, 'CREATE', ?)
  `).run(incident.id, userId, 'Incident created with status OPEN');

  if (technician_id) {
    db.prepare(`
      INSERT INTO notifications (user_id, incident_id, type, message)
      VALUES (?, ?, 'ASSIGNMENT', ?)
    `).run(technician_id, incident.id, `You have been assigned to Case #${incident.case_no}`);
  }

  return incident;
}

export function updateIncident(id, payload, user) {
  const {
    technician_id,
    root_cause,
    last_action,
    power_before,
    power_after,
    classification_id,
    status,
    initial_problem,
    ncal,
    odp_bts,
    level_support,
    customer_id,
    indikasi,
    kabel,
    panjang_kabel,
    pic,
    customer_terdampak,
    sla,
    koordinat,
  } = payload;

  const old = getIncidentById(id);
  if (!old) {
    const error = new Error('Not found');
    error.status = 404;
    throw error;
  }

  db.prepare(`
    UPDATE incidents SET
      technician_id = COALESCE(?, technician_id),
      root_cause = COALESCE(?, root_cause),
      last_action = COALESCE(?, last_action),
      power_before = COALESCE(?, power_before),
      power_after = COALESCE(?, power_after),
      indikasi = COALESCE(?, indikasi),
      kabel = COALESCE(?, kabel),
      panjang_kabel = COALESCE(?, panjang_kabel),
      pic = COALESCE(?, pic),
      customer_terdampak = COALESCE(?, customer_terdampak),
      classification_id = COALESCE(?, classification_id),
      status = COALESCE(?, status),
      initial_problem = COALESCE(?, initial_problem),
      ncal = COALESCE(?, ncal),
      odp_bts = COALESCE(?, odp_bts),
      level_support = COALESCE(?, level_support),
      customer_id = COALESCE(?, customer_id),
      sla = COALESCE(?, sla),
      koordinat = COALESCE(?, koordinat),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    technician_id || null,
    root_cause || null,
    last_action || null,
    power_before ?? null,
    power_after ?? null,
    indikasi ?? null,
    kabel || null,
    panjang_kabel ?? null,
    pic ?? null,
    customer_terdampak ?? null,
    classification_id ?? null,
    status ?? null,
    initial_problem ?? null,
    ncal ?? null,
    odp_bts ?? null,
    level_support ?? null,
    customer_id ?? null,
    sla ?? null,
    koordinat ?? null,
    id
  );

  const changes = [];
  if (technician_id && technician_id !== old.technician_id) changes.push('Technician changed');
  if (root_cause) changes.push(`Cause: ${root_cause}`);
  if (last_action) changes.push(`Last Action: ${last_action}`);
  if (power_before && power_before !== old.power_before) changes.push(`Power Before: ${power_before}`);
  if (power_after && power_after !== old.power_after) changes.push(`Power After: ${power_after}`);
  if (classification_id && classification_id !== old.classification_id) changes.push('Classification changed');

  const detailStr = changes.length > 0 ? changes.join(' | ') : null;
  if (detailStr) {
    db.prepare(`
      INSERT INTO audit_logs (incident_id, user_id, action, details)
      VALUES (?, ?, 'UPDATE', ?)
    `).run(id, user.id, detailStr);
  }

  if (technician_id && technician_id !== old.technician_id) {
    db.prepare(`
      INSERT INTO notifications (user_id, incident_id, type, message)
      VALUES (?, ?, 'ASSIGNMENT', ?)
    `).run(technician_id, id, `You have been assigned to Case #${old.case_no}`);
  }

  if (user.role === 'technician' && changes.length > 0) {
    db.prepare(`
      INSERT INTO notifications (target_role, incident_id, type, message)
      VALUES ('staff', ?, 'TECH_UPDATE', ?)
    `).run(id, `Technician ${user.name} updated Case #${old.case_no}: ${detailStr}`);
  }

  return {
    incident: getIncidentById(id),
    old,
    changes,
  };
}
