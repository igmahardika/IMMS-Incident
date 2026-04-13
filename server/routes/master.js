import express from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { geocode } from '../utils/geocoder.js';
import logger from '../utils/logger.js';

const router = express.Router();
const USER_ROLE_PRIORITY = `
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'noc' THEN 3
    WHEN 'technician' THEN 4
    ELSE 9
  END
`;

function normalizeIds(ids) {
  return [...new Set((ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
}

// ── MASTER CUSTOMER ─────────────────────────────────────────────────────────────
router.get('/customers', authenticate, (req, res) => {
  res.json(db.prepare('SELECT * FROM master_customer ORDER BY company_name').all());
});
router.post('/customers', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { customer_id, service_id, company_name, brand_site, address, service_type, grade, support_level, link_coverage, sla, latitude, longitude, city, province } = req.body;
  try {
    const r = db.prepare('INSERT INTO master_customer (customer_id, service_id, company_name, brand_site, address, service_type, grade, support_level, link_coverage, sla, latitude, longitude, city, province) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(customer_id, service_id, company_name, brand_site, address || null, service_type || null, grade || null, support_level || null, link_coverage || null, sla || null, latitude || null, longitude || null, city || null, province || null);
    res.status(201).json(db.prepare('SELECT * FROM master_customer WHERE id = ?').get(r.lastInsertRowid));
  } catch(e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Customer ID atau Service ID sudah digunakan' });
    res.status(500).json({ error: e.message });
  }
});
router.post('/customers/batch', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { customers } = req.body;
  if (!customers || !Array.isArray(customers)) return res.status(400).json({ error: 'Invalid data' });

  const insert = db.prepare(`
    INSERT INTO master_customer (customer_id, service_id, company_name, brand_site, address, service_type, grade, support_level, link_coverage, sla, latitude, longitude, city, province) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(customer_id) DO UPDATE SET 
      service_id=excluded.service_id, company_name=excluded.company_name, brand_site=excluded.brand_site,
      address=excluded.address, service_type=excluded.service_type, grade=excluded.grade, 
      support_level=excluded.support_level, link_coverage=excluded.link_coverage, sla=excluded.sla,
      latitude=excluded.latitude, longitude=excluded.longitude, city=excluded.city, province=excluded.province
  `);
  
  const insertMany = db.transaction((rows) => {
    let count = 0;
    for (const row of rows) {
      if (!row.customer_id) continue;
      insert.run(
        row.customer_id, row.service_id || String(Math.random()), row.company_name || '-', row.brand_site || '-', 
        row.address || null, row.service_type || null, row.grade || null, row.support_level || null, row.link_coverage || null, row.sla || null,
        row.latitude || null, row.longitude || null, row.city || null, row.province || null
      );
      count++;
    }
    return count;
  });

  try {
    const count = insertMany(customers);
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.put('/customers/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { customer_id, service_id, company_name, brand_site, address, service_type, grade, support_level, link_coverage, is_active, sla, latitude, longitude, city, province } = req.body;
  try {
    db.prepare('UPDATE master_customer SET customer_id = COALESCE(?, customer_id), service_id = COALESCE(?, service_id), company_name = COALESCE(?, company_name), brand_site = COALESCE(?, brand_site), address = COALESCE(?, address), service_type = COALESCE(?, service_type), grade = COALESCE(?, grade), support_level = COALESCE(?, support_level), link_coverage = COALESCE(?, link_coverage), sla = COALESCE(?, sla), latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude), city = COALESCE(?, city), province = COALESCE(?, province), is_active = COALESCE(?, is_active) WHERE id = ?').run(customer_id ?? null, service_id ?? null, company_name ?? null, brand_site ?? null, address ?? null, service_type ?? null, grade ?? null, support_level ?? null, link_coverage ?? null, sla ?? null, latitude ?? null, longitude ?? null, city ?? null, province ?? null, is_active ?? null, req.params.id);
    res.json(db.prepare('SELECT * FROM master_customer WHERE id = ?').get(req.params.id));
  } catch(e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Customer ID atau Service ID sudah digunakan' });
    res.status(500).json({ error: e.message });
  }
});
router.delete('/customers/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('UPDATE master_customer SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── MASTER CLASSIFICATIONS ───────────────────────────────────────────────────────────
router.get('/classifications', authenticate, (req, res) => {
  res.json(db.prepare('SELECT * FROM master_classifications WHERE is_active = 1 ORDER BY klasifikasi, sub_klasifikasi').all());
});
router.post('/classifications', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { klasifikasi, sub_klasifikasi } = req.body;
  const r = db.prepare('INSERT INTO master_classifications (klasifikasi, sub_klasifikasi) VALUES (?, ?)').run(klasifikasi, sub_klasifikasi);
  res.status(201).json(db.prepare('SELECT * FROM master_classifications WHERE id = ?').get(r.lastInsertRowid));
});
router.put('/classifications/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { klasifikasi, sub_klasifikasi, is_active } = req.body;
  db.prepare('UPDATE master_classifications SET klasifikasi = COALESCE(?, klasifikasi), sub_klasifikasi = COALESCE(?, sub_klasifikasi), is_active = COALESCE(?, is_active) WHERE id = ?').run(klasifikasi ?? null, sub_klasifikasi ?? null, is_active ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM master_classifications WHERE id = ?').get(req.params.id));
});
router.delete('/classifications/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('UPDATE master_classifications SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── USERS ─────────────────────────────────────────────────────────────────────
router.get('/users', authenticate, authorize('admin', 'manager', 'noc'), (req, res) => {
  res.json(
    db.prepare(`
      SELECT id, username, role, name, email, employee_id, is_active, created_at
      FROM users
      ORDER BY ${USER_ROLE_PRIORITY}, is_active DESC, name
    `).all()
  );
});
router.post('/users', authenticate, authorize('admin'), (req, res) => {
  const { username, password, role, name, email, employee_id } = req.body;

  if (!username?.trim() || !password || !name?.trim()) {
    return res.status(400).json({ error: 'Username, password, and name are required.' });
  }

  if (role && !['admin', 'manager', 'noc', 'technician'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, role, name, email, employee_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      username.trim(),
      hash,
      role || 'technician',
      name.trim(),
      email?.trim() || null,
      employee_id?.trim() || null
    );

    const user = db.prepare(`
      SELECT id, username, role, name, email, employee_id, is_active
      FROM users
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username is already in use.' });
    }

    res.status(500).json({ error: error.message });
  }
});
router.put('/users/:id', authenticate, authorize('admin'), (req, res) => {
  const { role, name, email, is_active, password, employee_id } = req.body;
  const targetId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);

  if (!existing) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (role && !['admin', 'manager', 'noc', 'technician'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  if (req.user.id === targetId) {
    if (is_active === false || is_active === 0) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    if (role && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot downgrade your own admin role.' });
    }
  }

  try {
    if (typeof password === 'string' && password.trim()) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, targetId);
    }

    db.prepare(`
      UPDATE users
      SET role = ?,
          name = ?,
          email = ?,
          employee_id = ?,
          is_active = ?
      WHERE id = ?
    `).run(
      role ?? existing.role,
      name?.trim() || existing.name,
      email === undefined ? existing.email : (email?.trim() || null),
      employee_id === undefined ? existing.employee_id : (employee_id?.trim() || null),
      is_active === undefined ? existing.is_active : Number(Boolean(is_active)),
      targetId
    );

    res.json(
      db.prepare(`
        SELECT id, username, role, name, email, employee_id, is_active
        FROM users
        WHERE id = ?
      `).get(targetId)
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.delete('/users/:id', authenticate, authorize('admin'), (req, res) => {
  const targetId = Number(req.params.id);

  if (req.user.id === targetId) {
    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  }

  try {
    const result = db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(targetId);

    if (!result.changes) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── LEGACY TECHNICAL SUPPORT COMPATIBILITY ───────────────────────────────────
router.get('/technical-support', authenticate, authorize('admin', 'manager', 'noc'), (req, res) => {
  const personnel = db.prepare(`
    SELECT
      id,
      employee_id AS no,
      name,
      UPPER(role) AS unit,
      is_active,
      created_at
    FROM users
    WHERE is_active = 1
      AND role IN ('technician', 'noc')
    ORDER BY ${USER_ROLE_PRIORITY}, name
  `).all();

  res.json(personnel);
});

function deprecatedTechnicalSupportResponse(res) {
  return res.status(410).json({
    error: 'Technical support registry has been merged into /master/users.',
  });
}

router.post('/technical-support', authenticate, authorize('admin', 'manager'), (_req, res) => deprecatedTechnicalSupportResponse(res));
router.post('/technical-support/batch', authenticate, authorize('admin', 'manager'), (_req, res) => deprecatedTechnicalSupportResponse(res));
router.put('/technical-support/:id', authenticate, authorize('admin', 'manager'), (_req, res) => deprecatedTechnicalSupportResponse(res));
router.delete('/technical-support/:id', authenticate, authorize('admin'), (_req, res) => deprecatedTechnicalSupportResponse(res));

// ── MASTER DISTRIBUSI ───────────────────────────────────────────────────────
router.get('/distribusi', authenticate, (req, res) => {
  res.json(db.prepare('SELECT * FROM master_distribusi WHERE is_active = 1 ORDER BY type, level_1, level_2, level_3, level_4').all());
});

router.post('/distribusi', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { type, level_1, level_2, level_3, level_4, latitude, longitude } = req.body;
  const r = db.prepare('INSERT INTO master_distribusi (type, level_1, level_2, level_3, level_4, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)').run(type, level_1, level_2 || null, level_3 || null, level_4 || null, latitude || null, longitude || null);
  res.status(201).json(db.prepare('SELECT * FROM master_distribusi WHERE id = ?').get(r.lastInsertRowid));
});

router.post('/distribusi/batch', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { type, data } = req.body; // type: 'Fiber Optic' or 'Wireless'
  if (!data || !Array.isArray(data)) return res.status(400).json({ error: 'Invalid data' });

  const insert = db.prepare('INSERT INTO master_distribusi (type, level_1, level_2, level_3, level_4) VALUES (?, ?, ?, ?, ?)');
  const insertMany = db.transaction((rows) => {
    let count = 0;
    for (const row of rows) {
      // row keys depend on type
      if (type === 'Fiber Optic') {
        const { POP, OSC, ODC, ODP } = row;
        if (!POP) continue;
        insert.run('Fiber Optic', POP, OSC || null, ODC || null, ODP || null);
      } else {
        const { BTS, RADIO } = row;
        if (!BTS) continue;
        insert.run('Wireless', BTS, RADIO || null, null, null);
      }
      count++;
    }
    return count;
  });

  try {
    const count = insertMany(data);
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/distribusi/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { type, level_1, level_2, level_3, level_4, latitude, longitude, is_active } = req.body;
  db.prepare('UPDATE master_distribusi SET type = COALESCE(?, type), level_1 = COALESCE(?, level_1), level_2 = COALESCE(?, level_2), level_3 = COALESCE(?, level_3), level_4 = COALESCE(?, level_4), latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude), is_active = COALESCE(?, is_active) WHERE id = ?').run(type ?? null, level_1 ?? null, level_2 ?? null, level_3 ?? null, level_4 ?? null, latitude ?? null, longitude ?? null, is_active ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM master_distribusi WHERE id = ?').get(req.params.id));
});

router.delete('/distribusi/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('UPDATE master_distribusi SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── MASTER ACTIONS (HANDLING) ────────────────────────────────────────────────
router.get('/actions', authenticate, (req, res) => {
  res.json(db.prepare('SELECT * FROM master_actions WHERE is_active = 1 ORDER BY name').all());
});

router.post('/actions', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { name } = req.body;
  const r = db.prepare('INSERT INTO master_actions (name) VALUES (?)').run(name);
  res.status(201).json(db.prepare('SELECT * FROM master_actions WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/actions/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { name, is_active } = req.body;
  db.prepare('UPDATE master_actions SET name = COALESCE(?, name), is_active = COALESCE(?, is_active) WHERE id = ?').run(name ?? null, is_active ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM master_actions WHERE id = ?').get(req.params.id));
});

// ── AUTO-GEOCODING CUSTOMERS ──────────────────────────────────────────────────
router.get('/customers/missing-coords', authenticate, (req, res) => {
  const missing = db.prepare(`
    SELECT id, company_name, brand_site, address, city, province
    FROM master_customer
    WHERE latitude IS NULL OR longitude IS NULL
  `).all();
  res.json(missing);
});

router.post('/customers/auto-geocode', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const normalizedIds = normalizeIds(req.body?.ids);
  if (!normalizedIds.length) return res.status(400).json({ error: 'Invalid IDs' });

  try {
    const placeholders = normalizedIds.map(() => '?').join(', ');
    const items = db.prepare(`SELECT * FROM master_customer WHERE id IN (${placeholders})`).all(...normalizedIds);
    const updateStmt = db.prepare('UPDATE master_customer SET latitude = ?, longitude = ? WHERE id = ?');

    const results = [];

    for (const customer of items) {
      const baseAddress = String(customer.address || '').trim();

      if (!baseAddress) {
        results.push({ id: customer.id, success: false, reason: 'missing_address' });
        continue;
      }

      const found = await geocode(baseAddress, {
        city: customer.city,
        province: customer.province,
      });

      if (found) {
        updateStmt.run(found.latitude, found.longitude, customer.id);
        results.push({ id: customer.id, success: true, ...found });
      } else {
        results.push({ id: customer.id, success: false, reason: 'not_found' });
      }
    }

    const updated = results.filter((result) => result.success).length;
    const skipped = results.filter((result) => result.reason === 'missing_address').length;
    const failed = results.length - updated - skipped;

    logger.info(`[Geocode][Customers] requested=${normalizedIds.length} updated=${updated} failed=${failed} skipped=${skipped}`);
    res.json({ success: true, total: results.length, updated, failed, skipped, results });
  } catch (error) {
    logger.error(`[Geocode][Customers] ${error.message}`);
    res.status(500).json({ error: 'Customer geocoding failed.' });
  }
});

// ── AUTO-GEOCODING DISTRIBUSI ──────────────────────────────────────────────────
router.get('/distribusi/missing-coords', authenticate, (req, res) => {
  const missing = db.prepare(`
    SELECT id, type, level_1, level_2, level_3, level_4
    FROM master_distribusi
    WHERE latitude IS NULL OR longitude IS NULL
  `).all();
  res.json(missing);
});

router.post('/distribusi/auto-geocode', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const normalizedIds = normalizeIds(req.body?.ids);
  if (!normalizedIds.length) return res.status(400).json({ error: 'Invalid IDs' });

  try {
    const placeholders = normalizedIds.map(() => '?').join(', ');
    const items = db.prepare(`SELECT * FROM master_distribusi WHERE id IN (${placeholders})`).all(...normalizedIds);
    const updateStmt = db.prepare('UPDATE master_distribusi SET latitude = ?, longitude = ? WHERE id = ?');

    const results = [];

    for (const item of items) {
      const locationTerms = item.type === 'Fiber Optic'
        ? [item.level_4, item.level_3, item.level_2, item.level_1]
        : [item.level_1, item.level_2];

      const query = locationTerms.filter((term) => term && term.length >= 3).join(', ');
      if (!query) {
        results.push({ id: item.id, success: false, reason: 'missing_location' });
        continue;
      }

      const found = await geocode(query, {
        city: 'Semarang',
        province: 'Jawa Tengah',
      });

      if (found) {
        updateStmt.run(found.latitude, found.longitude, item.id);
        results.push({ id: item.id, success: true, ...found });
      } else {
        results.push({ id: item.id, success: false, reason: 'not_found' });
      }
    }

    const updated = results.filter((result) => result.success).length;
    const skipped = results.filter((result) => result.reason === 'missing_location').length;
    const failed = results.length - updated - skipped;

    logger.info(`[Geocode][Distribusi] requested=${normalizedIds.length} updated=${updated} failed=${failed} skipped=${skipped}`);
    res.json({ success: true, total: results.length, updated, failed, skipped, results });
  } catch (error) {
    logger.error(`[Geocode][Distribusi] ${error.message}`);
    res.status(500).json({ error: 'Distribution geocoding failed.' });
  }
});

export default router;
