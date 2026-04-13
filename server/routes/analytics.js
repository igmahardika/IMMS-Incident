import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import fs from 'fs';

const router = express.Router();

// ─── Duration averages by NCAL per month ─────────────────────────────────────
router.get('/duration', authenticate, (req, res) => {
  const { year } = req.query;
  const y = year || new Date().getFullYear();
  const rows = db.prepare(`
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
  `).all(String(y));
  res.json(rows);
});

// ─── SLA summary ─────────────────────────────────────────────────────────────
router.get('/sla', authenticate, (req, res) => {
  const { year, month } = req.query;
  let where = "i.status = 'done'";
  const params = [];
  if (year) { where += ` AND strftime('%Y', i.end_time) = ?`; params.push(String(year)); }
  if (month) { where += ` AND strftime('%m', i.end_time) = ?`; params.push(String(month).padStart(2, '0')); }

  const rows = db.prepare(`
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
  res.json(rows);
});

// ─── Root Cause breakdown ─────────────────────────────────────────────────────
router.get('/root-cause', authenticate, (req, res) => {
  const { year, month, ncal } = req.query;
  let where = "i.status = 'done'";
  const params = [];
  if (year) { where += ` AND strftime('%Y', i.end_time) = ?`; params.push(String(year)); }
  if (month) { where += ` AND strftime('%m', i.end_time) = ?`; params.push(String(month).padStart(2, '0')); }
  if (ncal) { where += ` AND i.ncal = ?`; params.push(ncal); }

  const rows = db.prepare(`
    SELECT
      COALESCE(c.sub_klasifikasi, 'Tidak Terklasifikasi') AS classification,
      COUNT(*) AS count
    FROM incidents i
    LEFT JOIN master_classifications c ON i.classification_id = c.id
    WHERE ${where}
    GROUP BY classification
    ORDER BY count DESC
  `).all(...params);
  res.json(rows);
});

// ─── Dashboard KPI ─────────────────────────────────────────────────────────
router.get('/dashboard', authenticate, (req, res) => {
  const activeByNcal = db.prepare(`
    SELECT ncal, COUNT(*) as count FROM incidents WHERE status != 'done' GROUP BY ncal
  `).all();

  const totalActive = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status != 'done'").get().c;
  const totalDone = db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status = 'done'").get().c;

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

  res.json({ activeByNcal, totalActive, totalDone, monthlyTrend, recentClosed });
});

// ─── Technician performance ───────────────────────────────────────────────────
router.get('/technician-perf', authenticate, (req, res) => {
  const { year, month } = req.query;
  let where = "i.status = 'done'";
  const params = [];
  if (year) { where += ` AND strftime('%Y', i.end_time) = ?`; params.push(String(year)); }
  if (month) { where += ` AND strftime('%m', i.end_time) = ?`; params.push(String(month).padStart(2, '0')); }

  const rows = db.prepare(`
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
  res.json(rows);
});

// ─── Trouble Map Data ────────────────────────────────────────────────────────
router.get('/trouble-map', authenticate, (req, res) => {
  const qStart = req.query.start_date;
  const qEnd = req.query.end_date;
  
  const start_date = qStart || '2026-01-01 00:00:00';
  const end_date = qEnd || '2026-12-31 23:59:59';

  logger.info(`[API] /trouble-map date range: ${JSON.stringify({ start_date, end_date })}`);

  const rows = db.prepare(`
    SELECT 
      c.id,
      c.company_name,
      c.brand_site,
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
  `).all(start_date, end_date, start_date, end_date);
  
  try {
    fs.appendFileSync('/tmp/imms_trouble_map.log', `[${new Date().toISOString()}] Start: ${start_date}, End: ${end_date}, Found: ${rows.length}\n`);
  } catch {
    // Best-effort debug logging only.
  }
  
  logger.info(`[API] /trouble-map result rows: ${rows.length}`);
  res.json(rows);
});

// ─── Distribution Trouble Spots ───────────────────────────────────────────────
router.get('/distribution-trouble', authenticate, (req, res) => {
  const qStart = req.query.start_date;
  const qEnd = req.query.end_date;
  
  const start_date = qStart || '2026-01-01 00:00:00';
  const end_date = qEnd || '2026-12-31 23:59:59';

  logger.info(`[API] /distribution-trouble date range: ${JSON.stringify({ start_date, end_date })}`);

  const rows = db.prepare(`
    SELECT 
      d.id,
      d.level_1,
      d.level_2,
      d.level_3,
      d.level_4,
      d.type,
      d.latitude,
      d.longitude,
      COUNT(i.id) as incident_count,
      MAX(i.created_at) as last_incident_at
    FROM incidents i
    JOIN master_distribusi d ON i.odp_bts = d.level_4 OR i.odp_bts = d.level_2
    WHERE i.ncal IN ('YELLOW', 'ORANGE', 'RED', 'BLACK')
      AND (
        (strftime('%Y-%m-%d %H:%M:%S', i.created_at) BETWEEN ? AND ?)
        OR (strftime('%Y-%m-%d %H:%M:%S', i.end_time) BETWEEN ? AND ?)
      )
      AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL
    GROUP BY d.id
    ORDER BY incident_count DESC
  `).all(start_date, end_date, start_date, end_date);
  
  logger.info(`[API] /distribution-trouble result rows: ${rows.length}`);
  res.json(rows);
});

export default router;
