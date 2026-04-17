import fs from 'fs';
import db from '../../db.js';
import logger from '../../utils/logger.js';
import { buildCompletedIncidentFilter, resolveAnalyticsDateRange } from './utils.js';
import { normalizeInfraLabel, topologyCandidateKeys } from '../master/utils.js';

export function getDurationAnalytics(year) {
  const targetYear = year || new Date().getFullYear();
  return db.prepare(`
    SELECT
      strftime('%m', end_time) AS month,
      ncal,
      COUNT(*) AS total_cases,
      AVG(duration_nett_seconds) AS avg_nett_seconds,
      AVG(duration_gross_seconds) AS avg_gross_seconds
    FROM incidents
    WHERE status = 'done' AND strftime('%Y', end_time) = ?
    GROUP BY month, ncal
    ORDER BY month, ncal
  `).all(String(targetYear));
}

export function getSlaAnalytics({ year, month }) {
  const { where, params } = buildCompletedIncidentFilter({ year, month, alias: 'i' });
  return db.prepare(`
    SELECT
      i.ncal,
      COUNT(*) AS total_cases,
      AVG(i.duration_nett_seconds) AS avg_nett_seconds,
      SUM(CASE 
        WHEN i.ncal = 'BLACK' AND i.duration_nett_seconds <= 120 * 60 THEN 1
        WHEN i.ncal = 'BLUE' AND i.duration_nett_seconds <= 360 * 60 THEN 1
        WHEN i.ncal IN ('RED', 'ORANGE', 'YELLOW') AND i.duration_nett_seconds <= 240 * 60 THEN 1
        WHEN i.ncal NOT IN ('BLACK', 'BLUE', 'RED', 'ORANGE', 'YELLOW') AND i.duration_nett_seconds <= 240 * 60 THEN 1
        ELSE 0 
      END) AS sla_met,
      CASE 
        WHEN i.ncal = 'BLACK' THEN 120
        WHEN i.ncal = 'BLUE' THEN 360
        ELSE 240
      END AS sla_target_minutes
    FROM incidents i
    WHERE ${where}
    GROUP BY i.ncal
    ORDER BY i.ncal
  `).all(...params);
}

export function getRootCauseAnalytics({ year, month, ncal }) {
  const { where: baseWhere, params } = buildCompletedIncidentFilter({ year, month, alias: 'i' });
  let where = baseWhere;

  if (ncal) {
    where += ' AND i.ncal = ?';
    params.push(ncal);
  }

  return db.prepare(`
    SELECT
      COALESCE(c.sub_klasifikasi, 'Tidak Terklasifikasi') AS classification,
      COUNT(*) AS count
    FROM incidents i
    LEFT JOIN master_classifications c ON i.classification_id = c.id
    WHERE ${where}
    GROUP BY classification
    ORDER BY count DESC
  `).all(...params);
}

export function getDashboardAnalytics() {
  const activeByNcal = db.prepare(`
    SELECT ncal, COUNT(*) as count FROM incidents WHERE status != 'done' GROUP BY ncal
  `).all();
  const activeByStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM incidents
    WHERE status != 'done'
    GROUP BY status
  `).all();

  const totalActive = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status != 'done'").get().c;
  const totalDone = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status = 'done'").get().c;
  const createdToday = db.prepare(`
    SELECT COUNT(*) as c
    FROM incidents
    WHERE date(created_at) = date('now', 'localtime')
  `).get().c;
  const resolvedToday = db.prepare(`
    SELECT COUNT(*) as c
    FROM incidents
    WHERE status = 'done'
      AND date(end_time) = date('now', 'localtime')
  `).get().c;
  const unassignedActive = db.prepare(`
    SELECT COUNT(*) as c
    FROM incidents
    WHERE status != 'done'
      AND technician_id IS NULL
  `).get().c;

  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS ym, COUNT(*) AS total
    FROM incidents
    WHERE created_at >= date('now', '-6 months')
    GROUP BY ym ORDER BY ym
  `).all();

  const recentClosed = db.prepare(`
    SELECT i.*, u.name AS technician_name
    FROM incidents i LEFT JOIN users u ON i.technician_id = u.id
    WHERE i.status = 'done' ORDER BY i.end_time DESC LIMIT 5
  `).all();

  return {
    activeByNcal,
    activeByStatus,
    totalActive,
    totalDone,
    createdToday,
    resolvedToday,
    unassignedActive,
    monthlyTrend,
    recentClosed,
  };
}

export function getTechnicianPerformanceAnalytics({ year, month }) {
  const { where, params } = buildCompletedIncidentFilter({ year, month, alias: 'i' });
  return db.prepare(`
    SELECT
      COALESCE(u.name, 'Unassigned') AS technician,
      COUNT(*) AS total_handled,
      AVG(i.duration_nett_seconds) AS avg_nett_seconds,
      MIN(i.duration_nett_seconds) AS min_nett,
      MAX(i.duration_nett_seconds) AS max_nett
    FROM incidents i LEFT JOIN users u ON i.technician_id = u.id
    WHERE ${where}
    GROUP BY COALESCE(u.name, 'Unassigned')
    ORDER BY total_handled DESC
  `).all(...params);
}

export function getTroubleMapAnalytics({ startDate, endDate }) {
  const range = resolveAnalyticsDateRange(startDate, endDate);
  logger.info(`[API] /trouble-map date range: ${JSON.stringify(range)}`);

  const rows = db.prepare(`
    SELECT 
      c.id,
      c.company_name,
      c.brand_site,
      c.city,
      c.province,
      c.latitude,
      c.longitude,
      COUNT(i.id) as incident_count,
      MAX(i.created_at) as last_incident_at
    FROM incidents i
    JOIN master_customer c ON CAST(i.customer_id AS INTEGER) = c.id
    WHERE i.customer_id IS NOT NULL 
      AND (
        (strftime('%Y-%m-%d %H:%M:%S', i.created_at) BETWEEN ? AND ?)
        OR (strftime('%Y-%m-%d %H:%M:%S', i.end_time) BETWEEN ? AND ?)
      )
      AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
    GROUP BY c.id
    ORDER BY incident_count DESC
  `).all(range.startDate, range.endDate, range.startDate, range.endDate);

  try {
    fs.appendFileSync('/tmp/imms_trouble_map.log', `[${new Date().toISOString()}] Start: ${range.startDate}, End: ${range.endDate}, Found: ${rows.length}\n`);
  } catch {
    // Best-effort debug logging only.
  }

  logger.info(`[API] /trouble-map result rows: ${rows.length}`);
  return rows;
}

function buildTopologyLabelLookups(nodes) {
  const byLevel4 = new Map();
  const byLevel2 = new Map();
  const byLevel1 = new Map();

  const append = (map, key, node) => {
    if (!key) return;
    const items = map.get(key) || [];
    items.push(node);
    map.set(key, items);
  };

  for (const node of nodes) {
    append(byLevel4, normalizeInfraLabel(node.level_4), node);
    append(byLevel2, normalizeInfraLabel(node.level_2), node);
    append(byLevel1, normalizeInfraLabel(node.level_1), node);

    for (const candidate of topologyCandidateKeys(node.level_4)) append(byLevel4, candidate, node);
    for (const candidate of topologyCandidateKeys(node.level_2)) append(byLevel2, candidate, node);
    for (const candidate of topologyCandidateKeys(node.level_1)) append(byLevel1, candidate, node);
  }

  return { byLevel4, byLevel2, byLevel1 };
}

function pickUniqueNode(candidates = []) {
  if (!candidates.length) return null;
  const unique = new Map(candidates.map((item) => [item.id, item]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

function resolveTopologyIncidentNode(label, lookups) {
  const normalized = normalizeInfraLabel(label);
  const candidateKeys = [...new Set([normalized, ...topologyCandidateKeys(label)])].filter(Boolean);

  for (const key of candidateKeys) {
    const level4 = pickUniqueNode(lookups.byLevel4.get(key));
    if (level4) return level4;
  }

  for (const key of candidateKeys) {
    const level2 = pickUniqueNode(lookups.byLevel2.get(key));
    if (level2) return level2;
  }

  for (const key of candidateKeys) {
    const level1 = pickUniqueNode(lookups.byLevel1.get(key));
    if (level1) return level1;
  }

  return null;
}

export function getDistributionTroubleAnalytics({ startDate, endDate }) {
  const range = resolveAnalyticsDateRange(startDate, endDate);
  logger.info(`[API] /distribution-trouble date range: ${JSON.stringify(range)}`);

  const nodes = db.prepare(`
    SELECT id, level_1, level_2, level_3, level_4, type, latitude, longitude
    FROM master_distribusi
    WHERE is_active = 1
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
  `).all();

  const incidents = db.prepare(`
    SELECT id, odp_bts, created_at, end_time
    FROM incidents
    WHERE ncal IN ('YELLOW', 'ORANGE', 'RED', 'BLACK')
      AND odp_bts IS NOT NULL
      AND TRIM(odp_bts) <> ''
      AND (
        (strftime('%Y-%m-%d %H:%M:%S', created_at) BETWEEN ? AND ?)
        OR (strftime('%Y-%m-%d %H:%M:%S', end_time) BETWEEN ? AND ?)
      )
  `).all(range.startDate, range.endDate, range.startDate, range.endDate);

  const lookups = buildTopologyLabelLookups(nodes);
  const aggregated = new Map();

  for (const incident of incidents) {
    const matchedNode = resolveTopologyIncidentNode(incident.odp_bts, lookups);
    if (!matchedNode) continue;

    const current = aggregated.get(matchedNode.id) || {
      id: matchedNode.id,
      level_1: matchedNode.level_1,
      level_2: matchedNode.level_2,
      level_3: matchedNode.level_3,
      level_4: matchedNode.level_4,
      type: matchedNode.type,
      latitude: matchedNode.latitude,
      longitude: matchedNode.longitude,
      incident_count: 0,
      last_incident_at: null,
    };

    current.incident_count += 1;
    if (!current.last_incident_at || String(incident.created_at || '') > String(current.last_incident_at || '')) {
      current.last_incident_at = incident.created_at;
    }
    aggregated.set(matchedNode.id, current);
  }

  const rows = [...aggregated.values()].sort((left, right) => {
    if (right.incident_count !== left.incident_count) return right.incident_count - left.incident_count;
    return String(left.level_4 || left.level_2 || left.level_1).localeCompare(String(right.level_4 || right.level_2 || right.level_1));
  });

  logger.info(`[API] /distribution-trouble result rows: ${rows.length}`);
  return rows;
}
