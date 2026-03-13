import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ─── Helper: send escalation webhook ────────────────────────────────────────
async function sendEscalation(incident, type) {
  const cfg = db.prepare('SELECT * FROM escalation_config LIMIT 1').get();
  if (!cfg || !cfg.is_active || (!cfg.webhook_url && !cfg.webhook_url_vendor)) return;

  const durSec = incident.duration_nett_seconds || 0;
  const h = String(Math.floor(durSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((durSec % 3600) / 60)).padStart(2, '0');
  const s = String(durSec % 60).padStart(2, '0');
  const duration = `${h}:${m}:${s}`;

  const dateObj = new Date();
  const now = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const replaceVars = (template, isClose=false, customOdp = null) => {
    let ncalLabel = incident.ncal || '';
    if (isClose) {
      ncalLabel = `🟢 ${ncalLabel}`;
    } else {
      if (ncalLabel === 'BLACK') ncalLabel = `⚫ ${ncalLabel}`;
      else if (ncalLabel === 'RED') ncalLabel = `🔴 ${ncalLabel}`;
      else if (ncalLabel === 'ORANGE') ncalLabel = `🟠 ${ncalLabel}`;
      else if (ncalLabel === 'YELLOW') ncalLabel = `🟡 ${ncalLabel}`;
      else if (ncalLabel === 'BLUE') ncalLabel = `🔵 ${ncalLabel}`;
    }

    return (template || '')
      .replace('{ncal}', ncalLabel)
      .replace('{case_no}', incident.case_no || '')
      .replace('{company}', incident.company_name || '')
      .replace('{brand}', incident.brand_site || '')
      .replace('{root_cause}', incident.root_cause || '-')
      .replace('{problem}', incident.initial_problem || '-')
      .replace('{action}', incident.last_action || '-')
      .replace('{duration}', duration)
      .replace('{time}', now)
      .replace('{date}', dateStr)
      .replace('{address}', incident.address || '-')
      .replace('{koordinat}', incident.link_coverage || '-')
      .replace('{odp}', customOdp || incident.odp_bts || '-')
      .replace('{power_rx}', incident.power_before || '-')
      .replace('{support_level}', incident.level_support || '-')
      .replace('{indikasi}', incident.indikasi || '-')
      .replace('{kabel}', incident.kabel || '-')
      .replace('{panjang_kabel}', incident.panjang_kabel || '-')
      .replace('{pic}', incident.pic || '-')
      .replace('{customer_terdampak}', incident.customer_terdampak || '-');
  };

  try {
    if (cfg.type === 'telegram') {
      if (type === 'open') {
        const sendMsg = async (url, template, customOdp = null) => {
          if (!url || !template) return;
          const text = replaceVars(template, false, customOdp);
          await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }).catch(e=>console.error('Fetch fail:', e));
        };

        const defaultTemplates = {
          template_open_internal_blue: `N-CAL  : {ncal}\nNomor case : {case_no}\nSite  : {company}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndikasi : {indikasi}\npic: {pic}`,
          template_open_internal_yellow: `N-CAL  : {ncal}\nNomor case : {case_no}\nSite  : {company}\nStatus Link  : Down\nODP : {odp}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndikasi : {indikasi}\nWaktu Down : {time}\npic: {pic}`,
          template_open_vendor_yellow: `Maintenance Order\n{ncal}\nSite : {brand}\nNomor case : {case_no}\nTanggal case : {date}\nAlamat Customer : {address}\nKoordinat customer : {koordinat}\nNama ODP : {odp}\nPower RX Onu : {power_rx}\nKabel : {kabel}\nTotal Panjang : {panjang_kabel}\nPIC : {pic}\nProblem : {problem}`,
          template_close_internal_blue: `[CLOSE] {case_no}\n{ncal}\nSite: {company}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
          template_close_internal_yellow: `[CLOSE] {case_no}\n{ncal}\nSite: {company}\nStatus Link  : Up\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
          template_close_vendor_yellow: `Close Order\n{ncal}\nSite : {brand}\nNomor case : {case_no}\nRoot Cause: {root_cause}\nAction: {action}\nNett: {duration}`,
        };
        ['orange', 'red', 'black'].forEach(seg => {
          defaultTemplates[`template_open_internal_${seg}`] = `N-CAL  : {ncal}\nNomor case : {case_no}\nODP : {odp}\nStatus Link  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndikasi : {indikasi}\nWaktu Down : {time}\nCustomer Terdampak :\n{customer_terdampak}`;
          defaultTemplates[`template_close_internal_${seg}`] = `[CLOSE] {case_no}\n{ncal}\nODP : {odp}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`;
        });

        const seg = (incident.ncal || 'yellow').toLowerCase();
        
        // Prioritize segment-specific templates -> fallback to defaults -> fallback to global
        const tplOpenInternal = cfg[`template_open_internal_${seg}`] || defaultTemplates[`template_open_internal_${seg}`] || cfg.template_open;
        const tplOpenVendor = cfg[`template_open_vendor_${seg}`] || defaultTemplates[`template_open_vendor_${seg}`] || cfg.template_open_vendor;

        let entities = [null];
        if (['ORANGE', 'RED', 'BLACK'].includes(incident.ncal) && incident.odp_bts) {
           entities = incident.odp_bts.split(', ').map(e => e.trim()).filter(Boolean);
        }

        for (const entity of entities) {
          await sendMsg(cfg.webhook_url, tplOpenInternal, entity);
          
          // Send Vendor only for YELLOW segment
          if (incident.ncal === 'YELLOW' && cfg.webhook_url_vendor && tplOpenVendor) {
             await sendMsg(cfg.webhook_url_vendor, tplOpenVendor, entity);
          }
        }
      } else {
        const seg = (incident.ncal || 'yellow').toLowerCase();
        
        const defaultTemplates = {
          template_close_internal_blue: `[CLOSE] {case_no}\n{ncal}\nSite: {company}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
          template_close_internal_yellow: `[CLOSE] {case_no}\n{ncal}\nSite: {company}\nStatus Link  : Up\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
          template_close_vendor_yellow: `Close Order\n{ncal}\nSite : {brand}\nNomor case : {case_no}\nRoot Cause: {root_cause}\nAction: {action}\nNett: {duration}`,
        };
        ['orange', 'red', 'black'].forEach(s => {
          defaultTemplates[`template_close_internal_${s}`] = `[CLOSE] {case_no}\n{ncal}\nODP : {odp}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`;
        });

        const tplCloseInternal = cfg[`template_close_internal_${seg}`] || defaultTemplates[`template_close_internal_${seg}`] || cfg.template_close;
        const tplCloseVendor = cfg[`template_close_vendor_${seg}`] || defaultTemplates[`template_close_vendor_${seg}`] || cfg.template_close_vendor;

        if (cfg.webhook_url && tplCloseInternal) {
          await fetch(cfg.webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: replaceVars(tplCloseInternal, true) }) }).catch(e=>console.error('Close fail:', e));
        }
        // Send Vendor CLOSE only for YELLOW segment
        if (incident.ncal === 'YELLOW' && cfg.webhook_url_vendor && tplCloseVendor) {
           await fetch(cfg.webhook_url_vendor, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: replaceVars(tplCloseVendor, true) }) }).catch(e=>console.error('Vendor Close fail:', e));
        }
      }
    }
  } catch (e) {
    console.error('Escalation webhook failed:', e.message);
  }
}

// ─── Generate case number ────────────────────────────────────────────────────
function generateCaseNo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `C${yy}${mm}${dd}-${rand}`;
}

// ─── GET /api/incidents — active ────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT i.*, u.name AS technician_name,
           s.company_name, s.brand_site, s.grade, s.support_level as cust_support_level, s.customer_id as cust_id,
           c.klasifikasi, c.sub_klasifikasi
    FROM incidents i
    LEFT JOIN users u ON i.technician_id = u.id
    LEFT JOIN master_customer s ON i.customer_id = s.id
    LEFT JOIN master_classifications c ON i.classification_id = c.id
    WHERE i.status != 'done'
    ORDER BY i.created_at DESC
  `).all();
  res.json(rows);
});

// ─── GET /api/incidents/history ─────────────────────────────────────────────
router.get('/history', authenticate, (req, res) => {
  const { month, year, ncal, technician_id, limit = 200, offset = 0 } = req.query;
  let where = "i.status = 'done'";
  const params = [];
  if (month) { where += ` AND strftime('%m', i.end_time) = ?`; params.push(String(month).padStart(2, '0')); }
  if (year) { where += ` AND strftime('%Y', i.end_time) = ?`; params.push(year); }
  if (ncal) { where += ` AND i.ncal = ?`; params.push(ncal); }
  if (technician_id) { where += ` AND i.technician_id = ?`; params.push(technician_id); }

  const rows = db.prepare(`
    SELECT i.*, u.name AS technician_name,
           s.company_name, s.brand_site, s.grade, s.support_level as cust_support_level, s.customer_id as cust_id,
           c.klasifikasi, c.sub_klasifikasi
    FROM incidents i
    LEFT JOIN users u ON i.technician_id = u.id
    LEFT JOIN master_customer s ON i.customer_id = s.id
    LEFT JOIN master_classifications c ON i.classification_id = c.id
    WHERE ${where}
    ORDER BY i.end_time DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));
  res.json(rows);
});

// ─── GET /api/incidents/:id ─────────────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  const row = db.prepare(`
    SELECT i.*, u.name AS technician_name,
           s.company_name, s.brand_site, s.grade, s.support_level as cust_support_level, s.customer_id as cust_id, s.address, s.service_type, s.link_coverage,
           c.klasifikasi, c.sub_klasifikasi
    FROM incidents i
    LEFT JOIN users u ON i.technician_id = u.id
    LEFT JOIN master_customer s ON i.customer_id = s.id
    LEFT JOIN master_classifications c ON i.classification_id = c.id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const pauseLogs = db.prepare('SELECT * FROM pause_logs WHERE incident_id = ? ORDER BY pause_start').all(req.params.id);
  const auditLogs = db.prepare('SELECT al.*, u.name AS user_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.incident_id = ? ORDER BY al.timestamp DESC').all(req.params.id);
  res.json({ ...row, pause_logs: pauseLogs, audit_logs: auditLogs });
});

// ─── POST /api/incidents — create ───────────────────────────────────────────
router.post('/', authenticate, (req, res) => {
  try {
    const { customer_id, ncal, odp_bts, level_support, initial_problem, power_before, indikasi, kabel, panjang_kabel, pic, case_no, start_time, sla, customer_terdampak } = req.body;
    if (!case_no || !case_no.trim()) return res.status(400).json({ error: 'Nomor Case wajib diisi!' });
    const new_start_time = start_time || new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO incidents (case_no, customer_id, ncal, odp_bts, level_support, initial_problem, power_before, indikasi, kabel, panjang_kabel, pic, customer_terdampak, status, start_time, created_by, updated_at, sla)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, datetime('now'), ?)
    `).run(case_no.trim(), customer_id || null, ncal || 'YELLOW', odp_bts || null, level_support || null, initial_problem || null, power_before || null, indikasi || null, kabel || null, panjang_kabel || null, pic || null, customer_terdampak || null, new_start_time, req.user.id, sla || null);

    const incident = db.prepare(`SELECT i.*, s.company_name, s.brand_site, s.address, s.link_coverage FROM incidents i LEFT JOIN master_customer s ON i.customer_id = s.id WHERE i.id = ?`).get(result.lastInsertRowid);

    if (!incident) throw new Error('Failed to retrieve newly created incident.');

    db.prepare("INSERT INTO audit_logs (incident_id, user_id, action, details) VALUES (?, ?, 'CREATE', ?)").run(
      incident.id, req.user.id, `Incident created with status OPEN`
    );

    // Don't await escalation to keep response fast, but catch its error
    sendEscalation(incident, 'open').catch(err => {
      console.error('Non-blocking escalation error:', err);
    });

    res.status(201).json(incident);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Nomor Case sudah digunakan!' });
    }
    console.error('CRITICAL INCIDENT CREATE ERROR:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// ─── PUT /api/incidents/:id — update fields ─────────────────────────────────
router.put('/:id', authenticate, (req, res) => {
  const { technician_id, root_cause, last_action, power_before, power_after, classification_id, status, initial_problem, ncal, odp_bts, level_support, customer_id, indikasi, kabel, panjang_kabel, pic, customer_terdampak, sla } = req.body;
  const old = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });

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
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    technician_id ?? null,
    root_cause ?? null,
    last_action ?? null,
    power_before ?? null,
    power_after ?? null,
    indikasi ?? null,
    kabel ?? null,
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
    req.params.id
  );

  db.prepare("INSERT INTO audit_logs (incident_id, user_id, action, details) VALUES (?, ?, 'UPDATE', ?)").run(
    req.params.id, req.user.id, JSON.stringify(req.body)
  );

  res.json(db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id));
});

// ─── POST /api/incidents/:id/start ──────────────────────────────────────────
router.post('/:id/start', authenticate, (req, res) => {
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });
  if (incident.start_action_time) return res.status(400).json({ error: 'Already started' });

  const now = new Date().toISOString();
  db.prepare("UPDATE incidents SET start_action_time = ?, status = 'progress', updated_at = datetime('now') WHERE id = ?").run(now, req.params.id);
  db.prepare("INSERT INTO audit_logs (incident_id, user_id, action, details) VALUES (?, ?, 'START_ACTION', ?)").run(req.params.id, req.user.id, `Action started at ${now}`);

  res.json(db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id));
});

// ─── POST /api/incidents/:id/pause ──────────────────────────────────────────
router.post('/:id/pause', authenticate, (req, res) => {
  const { reason } = req.body;
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });
  if (incident.status !== 'progress') return res.status(400).json({ error: 'Incident must be in progress to pause' });

  // Check no open pause
  const openPause = db.prepare('SELECT * FROM pause_logs WHERE incident_id = ? AND pause_end IS NULL').get(req.params.id);
  if (openPause) return res.status(400).json({ error: 'Incident already paused' });

  const now = new Date().toISOString();
  db.prepare("INSERT INTO pause_logs (incident_id, pause_start, reason) VALUES (?, ?, ?)").run(req.params.id, now, reason || null);
  db.prepare("UPDATE incidents SET status = 'pending', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  db.prepare("INSERT INTO audit_logs (incident_id, user_id, action, details) VALUES (?, ?, 'PAUSE', ?)").run(req.params.id, req.user.id, reason || 'No reason given');

  res.json(db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id));
});

// ─── POST /api/incidents/:id/resume ─────────────────────────────────────────
router.post('/:id/resume', authenticate, (req, res) => {
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });
  if (incident.status !== 'pending') return res.status(400).json({ error: 'Incident is not paused' });

  const openPause = db.prepare('SELECT * FROM pause_logs WHERE incident_id = ? AND pause_end IS NULL').get(req.params.id);
  if (!openPause) return res.status(400).json({ error: 'No open pause log found' });

  const now = new Date().toISOString();
  const pauseSec = Math.floor((new Date(now) - new Date(openPause.pause_start)) / 1000);

  db.prepare('UPDATE pause_logs SET pause_end = ?, duration_seconds = ? WHERE id = ?').run(now, pauseSec, openPause.id);

  const totalPause = incident.total_pause_duration_seconds + pauseSec;
  db.prepare("UPDATE incidents SET status = 'progress', total_pause_duration_seconds = ?, updated_at = datetime('now') WHERE id = ?").run(totalPause, req.params.id);
  db.prepare("INSERT INTO audit_logs (incident_id, user_id, action, details) VALUES (?, ?, 'RESUME', ?)").run(req.params.id, req.user.id, `Paused for ${pauseSec}s`);

  res.json(db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id));
});

// ─── POST /api/incidents/:id/close ──────────────────────────────────────────
router.post('/:id/close', authenticate, (req, res) => {
  const { waktu_online } = req.body || {};
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });

  const now = new Date().toISOString();
  // Gunakan waktu_online jika diberikan, jika tidak gunakan waktu sekarang
  const endT = waktu_online ? new Date(waktu_online) : new Date(now);
  const startT = new Date(incident.start_time);
  const grossSec = Math.floor((endT - startT) / 1000);
  const nettSec = Math.max(0, grossSec - incident.total_pause_duration_seconds);

  db.prepare(`
    UPDATE incidents SET
      status = 'done', end_time = ?,
      duration_gross_seconds = ?, duration_nett_seconds = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(endT.toISOString(), grossSec, nettSec, req.params.id);

  const updated = db.prepare(`SELECT i.*, s.company_name, s.brand_site FROM incidents i LEFT JOIN master_customer s ON i.customer_id = s.id WHERE i.id = ?`).get(req.params.id);
  db.prepare("INSERT INTO audit_logs (incident_id, user_id, action, details) VALUES (?, ?, 'CLOSE', ?)").run(req.params.id, req.user.id, `Closed. Gross: ${grossSec}s, Nett: ${nettSec}s`);

  sendEscalation(updated, 'close');
  res.json(updated);
});

export default router;
