import db from '../../db.js';

export function getActiveIncidents({ role, userId }) {
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

  if (role === 'technician') {
    query += ' AND i.technician_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY i.created_at DESC';
  return db.prepare(query).all(...params);
}

export function getIncidentHistory({ month, year, ncal, technician_id, limit = 200, offset = 0 }) {
  let where = "i.status = 'done'";
  const params = [];

  if (month) {
    where += ` AND strftime('%m', i.end_time) = ?`;
    params.push(String(month).padStart(2, '0'));
  }
  if (year) {
    where += ` AND strftime('%Y', i.end_time) = ?`;
    params.push(year);
  }
  if (ncal) {
    where += ` AND i.ncal = ?`;
    params.push(ncal);
  }
  if (technician_id) {
    where += ` AND i.technician_id = ?`;
    params.push(technician_id);
  }

  return db.prepare(`
    SELECT i.*, u.name AS technician_name,
           s.company_name, s.brand_site, s.grade, s.support_level as cust_support_level, s.customer_id as cust_id,
           c.klasifikasi, c.sub_klasifikasi,
           c.klasifikasi AS classification_name,
           (SELECT pause_start FROM pause_logs WHERE incident_id = i.id ORDER BY pause_start ASC LIMIT 1 OFFSET 0) AS pause1_start,
           (SELECT pause_end   FROM pause_logs WHERE incident_id = i.id ORDER BY pause_start ASC LIMIT 1 OFFSET 0) AS pause1_end,
           (SELECT pause_start FROM pause_logs WHERE incident_id = i.id ORDER BY pause_start ASC LIMIT 1 OFFSET 1) AS pause2_start,
           (SELECT pause_end   FROM pause_logs WHERE incident_id = i.id ORDER BY pause_start ASC LIMIT 1 OFFSET 1) AS pause2_end,
           (SELECT timestamp FROM audit_logs WHERE incident_id = i.id AND action = 'ESCALATE' ORDER BY timestamp ASC LIMIT 1) AS escalation_time
    FROM incidents i
    LEFT JOIN users u ON i.technician_id = u.id
    LEFT JOIN master_customer s ON i.customer_id = s.id
    LEFT JOIN master_classifications c ON i.classification_id = c.id
    WHERE ${where}
    ORDER BY i.end_time DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));
}

export function getIncidentNotifications({ role, userId }) {
  if (role === 'technician') {
    return db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).all(userId);
  }

  return db.prepare(`
    SELECT * FROM notifications
    WHERE target_role IN ('noc', 'admin', 'manager', 'staff')
       OR user_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(userId);
}

export function getIncidentDetail(id) {
  const row = db.prepare(`
    SELECT i.*, u.name AS technician_name,
           s.company_name, s.brand_site, s.grade, s.support_level as cust_support_level, s.customer_id as cust_id, s.address, s.service_type, s.link_coverage,
           c.klasifikasi, c.sub_klasifikasi
    FROM incidents i
    LEFT JOIN users u ON i.technician_id = u.id
    LEFT JOIN master_customer s ON i.customer_id = s.id
    LEFT JOIN master_classifications c ON i.classification_id = c.id
    WHERE i.id = ?
  `).get(id);

  if (!row) return null;

  const pauseLogs = db.prepare('SELECT * FROM pause_logs WHERE incident_id = ? ORDER BY pause_start').all(id);
  const auditLogs = db.prepare(`
    SELECT al.*, u.name AS user_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.incident_id = ?
    ORDER BY al.timestamp DESC
  `).all(id);

  return { ...row, pause_logs: pauseLogs, audit_logs: auditLogs };
}

export function getRecurringIncidents(id) {
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
  if (!incident) return null;

  const params = [incident.id];
  let where = "id != ? AND created_at >= datetime('now', '-24 hours')";

  if (incident.customer_id) {
    where += ' AND customer_id = ?';
    params.push(incident.customer_id);
  } else if (incident.odp_bts) {
    where += ' AND odp_bts = ?';
    params.push(incident.odp_bts);
  } else {
    return { incident, list: [] };
  }

  const list = db.prepare(`SELECT * FROM incidents WHERE ${where} ORDER BY created_at DESC`).all(...params);
  return { incident, list };
}

export function getIncidentById(id) {
  return db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
}

export function getIncidentWithCustomerLite(id) {
  return db.prepare(`
    SELECT i.*, s.company_name, s.brand_site, s.address, s.link_coverage
    FROM incidents i
    LEFT JOIN master_customer s ON i.customer_id = s.id
    WHERE i.id = ?
  `).get(id);
}

export function getClosedIncidentView(id) {
  return db.prepare(`
    SELECT i.*, s.company_name, s.brand_site
    FROM incidents i
    LEFT JOIN master_customer s ON i.customer_id = s.id
    WHERE i.id = ?
  `).get(id);
}
