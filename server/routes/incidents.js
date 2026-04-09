import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { incidentCreateSchema, incidentUpdateSchema, validateRequest } from '../utils/validators.js';
import { getIO } from '../socket.js';

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

  const startTime = incident.start_time;
  const endTime = incident.end_time ? new Date(incident.end_time).getTime() : Date.now();
  const grossSeconds = Math.max(0, Math.floor((endTime - new Date(startTime).getTime()) / 1000));
  const level = Math.floor(grossSeconds / 3600) + 1;

  const dateObj = new Date();
  const now = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Strip type prefix (e.g. "ODC: ", "ODP: ", "BTS: ") from infra entity names
  // These prefixes are added in the UI for categorization but should not appear in notification
  const stripInfraPrefix = (val) => {
    if (!val) return val;
    return val.replace(/^(ODP|ODC|BTS|POP|RADIO|OSC):\s*/i, '').trim();
  };

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

    const rawOdp = customOdp || incident.odp_bts || '-';
    const cleanOdp = stripInfraPrefix(rawOdp);

    return (template || '')
      .replace('{ncal}', ncalLabel)
      .replace('{level}', String(level))
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
      .replace('{koordinat}', incident.koordinat || incident.link_coverage || '-')
      .replace('{odp}', cleanOdp)
      // Alias variables for segment-specific infra naming
      // RED segment uses {odc}, BLACK segment uses {pop}/{ose}
      .replace('{odc}', cleanOdp)
      .replace('{bts}', cleanOdp)
      .replace('{pop}', cleanOdp)
      .replace('{ose}', cleanOdp)
      .replace('{radio}', cleanOdp)
      .replace('{osc}', cleanOdp)
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
          template_open_internal_blue: `N-CAL : {ncal} - Level {level}\nNomor Case : {case_no}\nSite  : {brand}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nPIC: {pic}`,
          template_open_internal_yellow: `N-CAL : {ncal} - Level {level}\nNomor case : {case_no}\nSite  : {brand}\nStatus Link  : Down\nODP : {odp}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nWaktu Down : {time}\nPIC: {pic}`,
          template_open_vendor_yellow: `Maintenance Order\n{ncal}\nSite : {brand}\nNomor case : {case_no}\nTanggal case : {date}\nAlamat Customer : {address}\nKoordinat customer : {koordinat}\nNama ODP : {odp}\nPower RX Onu : {power_rx}\nKabel : {kabel}\nTotal Panjang : {panjang_kabel}\nPIC : {pic}\nProblem : {problem}`,
          template_close_internal_blue: `[CLOSE] {case_no}\n{ncal} - Level {level}\nSite: {brand}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
          template_close_internal_yellow: `[CLOSE] {case_no}\n{ncal} - Level {level}\nSite: {brand}\nStatus Link : Up\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
          template_close_vendor_yellow: `Close Order\n{ncal}\nSite : {brand}\nNomor case : {case_no}\nRoot Cause: {root_cause}\nAction: {action}\nNett: {duration}`,
        };
        // Segment-specific defaults matching user's customized templates
        defaultTemplates['template_open_internal_orange'] = `N-CAL : {ncal} - Level {level}\nNomor case : {case_no}\nODP : {odp}\nStatus Link  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nWaktu Down : {time}\nCustomer Terdampak :\n{customer_terdampak}`;
        defaultTemplates['template_open_internal_red'] = `N-CAL : {ncal} - Level {level}\nNomor case : {case_no}\nODC : {odc}\nStatus Link  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nWaktu Down : {time}\nCustomer Terdampak :\n{customer_terdampak}`;
        defaultTemplates['template_open_internal_black'] = `N-CAL : {ncal} - Level {level}\nNomor case : {case_no}\nPOP/OSC : {pop}\nStatus Link  : Down\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndication : {indikasi}\nWaktu Down : {time}\nCustomer Terdampak :\n{customer_terdampak}`;
        ['orange', 'red', 'black'].forEach(seg => {
          defaultTemplates[`template_close_internal_${seg}`] = `[CLOSE] {case_no}\n{ncal} - Level {level}\nInfra : {odp}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`;
        });

        const seg = (incident.ncal || 'yellow').toLowerCase();
        
        // Prioritize segment-specific templates -> fallback to defaults -> fallback to global
        const tplOpenInternal = cfg[`template_open_internal_${seg}`] || defaultTemplates[`template_open_internal_${seg}`] || cfg.template_open;
        const tplOpenVendor = cfg[`template_open_vendor_${seg}`] || defaultTemplates[`template_open_vendor_${seg}`] || cfg.template_open_vendor;

        let entities = [null];
        if (['ORANGE', 'RED', 'BLACK'].includes(incident.ncal) && incident.odp_bts) {
           // Split multiple entities, each may have prefix like "ODC: ODC PELABUHAN"
           // stripInfraPrefix is applied inside replaceVars so we pass raw values here
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
          template_close_internal_blue: `[CLOSE] {case_no}\n{ncal}\nSite: {brand}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
          template_close_internal_yellow: `[CLOSE] {case_no}\n{ncal}\nSite: {brand}\nStatus Link  : Up\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`,
          template_close_vendor_yellow: `Close Order\n{ncal}\nSite : {brand}\nNomor case : {case_no}\nRoot Cause: {root_cause}\nAction: {action}\nNett: {duration}`,
        };
        ['orange', 'red', 'black'].forEach(s => {
          defaultTemplates[`template_close_internal_${s}`] = `[CLOSE] {case_no}\n{ncal} - Level {level}\nODP : {odp}\nRoot Cause: {root_cause}\nNett Duration: {duration}\nSelesai: {time}`;
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
  let query = `
    SELECT i.*, u.name AS technician_name,
           s.company_name, s.brand_site, s.grade, s.support_level as cust_support_level, s.customer_id as cust_id,
           c.klasifikasi, c.sub_klasifikasi,
           (
             SELECT COUNT(*) FROM incidents 
             WHERE id != i.id 
             AND created_at >= datetime('now', '-24 hours')
             AND (
               (customer_id IS NOT NULL AND customer_id = i.customer_id)
               OR (customer_id IS NULL AND odp_bts IS NOT NULL AND odp_bts = i.odp_bts)
             )
           ) as recurring_count
    FROM incidents i
    LEFT JOIN users u ON i.technician_id = u.id
    LEFT JOIN master_customer s ON i.customer_id = s.id
    LEFT JOIN master_classifications c ON i.classification_id = c.id
    WHERE i.status != 'done'
  `;
  const params = [];

  if (req.user.role === 'technician') {
    query += ' AND i.technician_id = ?';
    params.push(req.user.id);
  }

  query += ' ORDER BY i.created_at DESC';

  const rows = db.prepare(query).all(...params);
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
           c.klasifikasi, c.sub_klasifikasi,
           c.klasifikasi AS classification_name,
           -- Pause slot 1
           (SELECT pause_start FROM pause_logs WHERE incident_id = i.id ORDER BY pause_start ASC LIMIT 1 OFFSET 0) AS pause1_start,
           (SELECT pause_end   FROM pause_logs WHERE incident_id = i.id ORDER BY pause_start ASC LIMIT 1 OFFSET 0) AS pause1_end,
           -- Pause slot 2
           (SELECT pause_start FROM pause_logs WHERE incident_id = i.id ORDER BY pause_start ASC LIMIT 1 OFFSET 1) AS pause2_start,
           (SELECT pause_end   FROM pause_logs WHERE incident_id = i.id ORDER BY pause_start ASC LIMIT 1 OFFSET 1) AS pause2_end,
           -- Escalation time from audit log (first ESCALATE action)
           (SELECT timestamp FROM audit_logs WHERE incident_id = i.id AND action = 'ESCALATE' ORDER BY timestamp ASC LIMIT 1) AS escalation_time
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

// ─── Notifications API ──────────────────────────────────────────────────────
router.get('/notifications', authenticate, (req, res) => {
  let rows;
  if (req.user.role === 'technician') {
    rows = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC LIMIT 50
    `).all(req.user.id);
  } else {
    // Admin/NOC/Manager see all staff-related updates
    rows = db.prepare(`
      SELECT * FROM notifications 
      WHERE target_role IN ('noc', 'admin', 'manager', 'staff') 
         OR user_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).all(req.user.id);
  }
  res.json(rows);
});

router.put('/notifications/:id/read', authenticate, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
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
router.post('/', authenticate, validateRequest(incidentCreateSchema), (req, res) => {
  try {
    const { customer_id, ncal, odp_bts, level_support, initial_problem, power_before, indikasi, kabel, panjang_kabel, pic, case_no, start_time, sla, customer_terdampak, koordinat, technician_id } = req.body;
    if (!case_no || !case_no.trim()) return res.status(400).json({ error: 'Nomor Case wajib diisi!' });
    const new_start_time = start_time || new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO incidents (case_no, customer_id, ncal, odp_bts, level_support, initial_problem, power_before, indikasi, kabel, panjang_kabel, pic, customer_terdampak, koordinat, status, start_time, created_by, updated_at, sla, technician_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, datetime('now'), ?, ?)
    `).run(case_no.trim(), customer_id || null, ncal || 'YELLOW', odp_bts || null, level_support || null, initial_problem || null, power_before || null, indikasi || null, kabel || null, panjang_kabel || null, pic || null, customer_terdampak || null, koordinat || null, new_start_time, req.user.id, sla || null, technician_id || null);

    const incident = db.prepare(`SELECT i.*, s.company_name, s.brand_site, s.address, s.link_coverage FROM incidents i LEFT JOIN master_customer s ON i.customer_id = s.id WHERE i.id = ?`).get(result.lastInsertRowid);

    if (!incident) throw new Error('Failed to retrieve newly created incident.');

    db.prepare("INSERT INTO audit_logs (incident_id, user_id, action, details) VALUES (?, ?, 'CREATE', ?)").run(
      incident.id, req.user.id, `Incident created with status OPEN`
    );

    // Don't await escalation to keep response fast, but catch its error
    sendEscalation(incident, 'open').catch(err => {
      console.error('Non-blocking escalation error:', err);
    });

    // ─── Internal Notifications ───
    if (technician_id) {
      db.prepare(`
        INSERT INTO notifications (user_id, incident_id, type, message)
        VALUES (?, ?, 'ASSIGNMENT', ?)
      `).run(technician_id, incident.id, `You have been assigned to Case #${incident.case_no}`);
    }

    getIO().emit('incident-updated', { type: 'create', incident });
    logger.info(`Incident created: Case #${incident.case_no} by User ID: ${req.user.id}`);
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
router.put('/:id', authenticate, validateRequest(incidentUpdateSchema), (req, res) => {
  const { technician_id, root_cause, last_action, power_before, power_after, classification_id, status, initial_problem, ncal, odp_bts, level_support, customer_id, indikasi, kabel, panjang_kabel, pic, customer_terdampak, sla, koordinat } = req.body;
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
    req.params.id
  );

  const changes = [];
  if (technician_id && technician_id !== old.technician_id) changes.push(`Technician changed`);
  if (root_cause) changes.push(`Cause: ${root_cause}`);
  if (last_action) changes.push(`Last Action: ${last_action}`);
  if (power_before && power_before !== old.power_before) changes.push(`Power Before: ${power_before}`);
  if (power_after && power_after !== old.power_after) changes.push(`Power After: ${power_after}`);
  if (classification_id && classification_id !== old.classification_id) changes.push(`Classification changed`);
  
  const detailStr = changes.length > 0 ? changes.join(' | ') : null;

  if (detailStr) {
    db.prepare("INSERT INTO audit_logs (incident_id, user_id, action, details) VALUES (?, ?, 'UPDATE', ?)").run(
      req.params.id, req.user.id, detailStr
    );
  }

  // ─── Internal Notifications ───
  // 1. Assignment Notification (to Technician)
  if (technician_id && technician_id != old.technician_id) {
    db.prepare(`
      INSERT INTO notifications (user_id, incident_id, type, message)
      VALUES (?, ?, 'ASSIGNMENT', ?)
    `).run(technician_id, req.params.id, `You have been assigned to Case #${old.case_no}`);
  }

  // 2. Update Notification (to Staff: NOC/Admin/Manager)
  if (req.user.role === 'technician' && changes.length > 0) {
    db.prepare(`
      INSERT INTO notifications (target_role, incident_id, type, message)
      VALUES ('staff', ?, 'TECH_UPDATE', ?)
    `).run(req.params.id, `Technician ${req.user.name} updated Case #${old.case_no}: ${detailStr}`);
  }

  getIO().emit('incident-updated', { type: 'update', id: req.params.id });
  logger.info(`Incident updated: Case #${old.case_no} by User ID: ${req.user.id}`);
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

  getIO().emit('incident-updated', { type: 'status_change', id: req.params.id });
  logger.info(`Action started for Case ID: ${req.params.id} by User ID: ${req.user.id}`);
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

  getIO().emit('incident-updated', { type: 'status_change', id: req.params.id });
  logger.info(`Incident paused: Case ID: ${req.params.id} by User ID: ${req.user.id}. Reason: ${reason || 'N/A'}`);
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

  getIO().emit('incident-updated', { type: 'status_change', id: req.params.id });
  logger.info(`Incident resumed: Case ID: ${req.params.id} by User ID: ${req.user.id}`);
  res.json(db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id));
});

// ─── POST /api/incidents/:id/close ──────────────────────────────────────────
router.post('/:id/close', authenticate, (req, res) => {
  const { waktu_online, root_cause, last_action, classification_id } = req.body || {};
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
    root_cause || null, 
    last_action || null, 
    classification_id || null, 
    req.params.id
  );

  const updated = db.prepare(`
    SELECT i.*, s.company_name, s.brand_site 
    FROM incidents i 
    LEFT JOIN master_customer s ON i.customer_id = s.id 
    WHERE i.id = ?
  `).get(req.params.id);
  
  db.prepare("INSERT INTO audit_logs (incident_id, user_id, action, details) VALUES (?, ?, 'CLOSE', ?)").run(
    req.params.id, 
    req.user.id, 
    `Closed. Gross: ${grossSec}s, Nett: ${nettSec}s`
  );

  sendEscalation(updated, 'close');
  getIO().emit('incident-updated', { type: 'close', id: req.params.id });
  logger.info(`Incident closed: Case #${updated.case_no} by User ID: ${req.user.id}`);
  res.json(updated);
});

// ─── GET /api/incidents/:id/recurring ───────────────────────────────────────
router.get('/:id/recurring', authenticate, (req, res) => {
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });

  // Look for other incidents for the same site (customer_id or odp_bts) in last 24h
  // We exclude the current one
  const params = [];
  let where = "id != ? AND created_at >= datetime('now', '-24 hours')";
  params.push(incident.id);

  if (incident.customer_id) {
    where += " AND customer_id = ?";
    params.push(incident.customer_id);
  } else if (incident.odp_bts) {
    where += " AND odp_bts = ?";
    params.push(incident.odp_bts);
  } else {
    // If no unique site ID, we can't reliably detect recurring
    return res.json({ is_recurring: false, count: 1 });
  }

  const list = db.prepare(`SELECT * FROM incidents WHERE ${where} ORDER BY created_at DESC`).all(...params);

  res.json({
    is_recurring: list.length >= 2, // 3rd event or more (including current)
    count: list.length + 1,
    history: list.map(l => ({ id: l.id, case_no: l.case_no, start_time: l.start_time, status: l.status }))
  });
});

// ─── DELETE /api/incidents/batch ──────────────────────────────────────────
router.delete('/batch', authenticate, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided' });
  }

  try {
    const runBatch = db.transaction((incidentIds) => {
      // Delete pause_logs and audit_logs first to avoid foreign key errors if ON DELETE CASCADE is not perfectly configured
      const placeholders = incidentIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM pause_logs WHERE incident_id IN (${placeholders})`).run(...incidentIds);
      db.prepare(`DELETE FROM audit_logs WHERE incident_id IN (${placeholders})`).run(...incidentIds);
      // Delete incidents
      const result = db.prepare(`DELETE FROM incidents WHERE id IN (${placeholders})`).run(...incidentIds);
      return result;
    });
    
    const result = runBatch(ids);
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    logger.error(`Batch delete error: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete incidents' });
  }
});


export default router;
