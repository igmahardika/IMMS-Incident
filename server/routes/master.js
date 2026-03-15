import express from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { geocode } from '../utils/geocoder.js';

const router = express.Router();

// ── MASTER CUSTOMER ─────────────────────────────────────────────────────────────
router.get('/customers', authenticate, (req, res) => {
  res.json(db.prepare('SELECT * FROM master_customer ORDER BY company_name').all());
});
router.post('/customers', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { customer_id, service_id, company_name, brand_site, address, service_type, grade, support_level, link_coverage, sla } = req.body;
  try {
    const r = db.prepare('INSERT INTO master_customer (customer_id, service_id, company_name, brand_site, address, service_type, grade, support_level, link_coverage, sla) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(customer_id, service_id, company_name, brand_site, address || null, service_type || null, grade || null, support_level || null, link_coverage || null, sla || null);
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
    INSERT INTO master_customer (customer_id, service_id, company_name, brand_site, address, service_type, grade, support_level, link_coverage, sla) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(customer_id) DO UPDATE SET 
      service_id=excluded.service_id, company_name=excluded.company_name, brand_site=excluded.brand_site,
      address=excluded.address, service_type=excluded.service_type, grade=excluded.grade, 
      support_level=excluded.support_level, link_coverage=excluded.link_coverage, sla=excluded.sla
  `);
  
  const insertMany = db.transaction((rows) => {
    let count = 0;
    for (const row of rows) {
      if (!row.customer_id) continue;
      insert.run(
        row.customer_id, row.service_id || String(Math.random()), row.company_name || '-', row.brand_site || '-', 
        row.address || null, row.service_type || null, row.grade || null, row.support_level || null, row.link_coverage || null, row.sla || null
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
  const { customer_id, service_id, company_name, brand_site, address, service_type, grade, support_level, link_coverage, is_active, sla } = req.body;
  try {
    db.prepare('UPDATE master_customer SET customer_id = COALESCE(?, customer_id), service_id = COALESCE(?, service_id), company_name = COALESCE(?, company_name), brand_site = COALESCE(?, brand_site), address = COALESCE(?, address), service_type = COALESCE(?, service_type), grade = COALESCE(?, grade), support_level = COALESCE(?, support_level), link_coverage = COALESCE(?, link_coverage), sla = COALESCE(?, sla), is_active = COALESCE(?, is_active) WHERE id = ?').run(customer_id ?? null, service_id ?? null, company_name ?? null, brand_site ?? null, address ?? null, service_type ?? null, grade ?? null, support_level ?? null, link_coverage ?? null, sla ?? null, is_active ?? null, req.params.id);
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
  res.json(db.prepare('SELECT id, username, role, name, email, employee_id, is_active, created_at FROM users ORDER BY name').all());
});
router.post('/users', authenticate, authorize('admin'), (req, res) => {
  const { username, password, role, name, email, employee_id } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users (username, password_hash, role, name, email, employee_id) VALUES (?, ?, ?, ?, ?, ?)').run(username, hash, role || 'technician', name, email || null, employee_id || null);
  const user = db.prepare('SELECT id, username, role, name, email, employee_id, is_active FROM users WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json(user);
});
router.put('/users/:id', authenticate, authorize('admin'), (req, res) => {
  const { role, name, email, is_active, password, employee_id } = req.body;
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  }
  db.prepare('UPDATE users SET role = COALESCE(?, role), name = COALESCE(?, name), email = COALESCE(?, email), employee_id = COALESCE(?, employee_id), is_active = COALESCE(?, is_active) WHERE id = ?').run(role ?? null, name ?? null, email ?? null, employee_id ?? null, is_active ?? null, req.params.id);
  res.json(db.prepare('SELECT id, username, role, name, email, employee_id, is_active FROM users WHERE id = ?').get(req.params.id));
});
router.delete('/users/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── MASTER TECHNICAL SUPPORT ──────────────────────────────────────────────────
router.get('/technical-support', authenticate, (req, res) => {
  res.json(db.prepare('SELECT * FROM master_technical_support WHERE is_active = 1 ORDER BY CAST(no AS INTEGER), name').all());
});

router.post('/technical-support', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { no, name, unit } = req.body;
  const r = db.prepare('INSERT INTO master_technical_support (no, name, unit) VALUES (?, ?, ?)').run(no || null, name, unit);
  res.status(201).json(db.prepare('SELECT * FROM master_technical_support WHERE id = ?').get(r.lastInsertRowid));
});

router.post('/technical-support/batch', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { data } = req.body;
  if (!data || !Array.isArray(data)) return res.status(400).json({ error: 'Invalid data' });

  const insert = db.prepare('INSERT INTO master_technical_support (no, name, unit) VALUES (?, ?, ?)');
  const insertMany = db.transaction((rows) => {
    let count = 0;
    for (const row of rows) {
      if (!row.name || !row.unit) continue;
      insert.run(row.no || null, row.name, row.unit);
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

router.put('/technical-support/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { no, name, unit, is_active } = req.body;
  db.prepare('UPDATE master_technical_support SET no = COALESCE(?, no), name = COALESCE(?, name), unit = COALESCE(?, unit), is_active = COALESCE(?, is_active) WHERE id = ?').run(no ?? null, name ?? null, unit ?? null, is_active ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM master_technical_support WHERE id = ?').get(req.params.id));
});

router.delete('/technical-support/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('UPDATE master_technical_support SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── MASTER DISTRIBUSI ───────────────────────────────────────────────────────
router.get('/distribusi', authenticate, (req, res) => {
  res.json(db.prepare('SELECT * FROM master_distribusi WHERE is_active = 1 ORDER BY type, level_1, level_2, level_3, level_4').all());
});

router.post('/distribusi', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { type, level_1, level_2, level_3, level_4 } = req.body;
  const r = db.prepare('INSERT INTO master_distribusi (type, level_1, level_2, level_3, level_4) VALUES (?, ?, ?, ?, ?)').run(type, level_1, level_2 || null, level_3 || null, level_4 || null);
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
  const { type, level_1, level_2, level_3, level_4, is_active } = req.body;
  db.prepare('UPDATE master_distribusi SET type = COALESCE(?, type), level_1 = COALESCE(?, level_1), level_2 = COALESCE(?, level_2), level_3 = COALESCE(?, level_3), level_4 = COALESCE(?, level_4), is_active = COALESCE(?, is_active) WHERE id = ?').run(type ?? null, level_1 ?? null, level_2 ?? null, level_3 ?? null, level_4 ?? null, is_active ?? null, req.params.id);
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
  const missing = db.prepare('SELECT id, company_name, brand_site, address FROM master_customer WHERE latitude IS NULL').all();
  res.json(missing);
});

router.post('/customers/auto-geocode', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { ids } = req.body; 
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

  const items = db.prepare(`SELECT * FROM master_customer WHERE id IN (${ids.join(',')})`).all();
  const updateStmt = db.prepare('UPDATE master_customer SET latitude = ?, longitude = ? WHERE id = ?');
  
  const results = [];
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (const c of items) {
    const searchTerms = [
      c.address,
      `${c.brand_site}, ${c.city || ''}`,
      `${c.company_name}, ${c.city || ''}`
    ].filter(Boolean);

    let found = null;
    for (const term of searchTerms) {
      found = await geocode(term);
      if (found) break;
      await delay(1000);
    }

    if (found) {
      updateStmt.run(found.latitude, found.longitude, c.id);
      results.push({ id: c.id, success: true, ...found });
    } else {
      results.push({ id: c.id, success: false });
    }
  }

  res.json({ success: true, results });
});

// ── AUTO-GEOCODING DISTRIBUSI ──────────────────────────────────────────────────
router.get('/distribusi/missing-coords', authenticate, (req, res) => {
  const missing = db.prepare('SELECT id, type, level_1, level_2, level_3, level_4 FROM master_distribusi WHERE latitude IS NULL').all();
  res.json(missing);
});

router.post('/distribusi/auto-geocode', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

  const items = db.prepare(`SELECT * FROM master_distribusi WHERE id IN (${ids.join(',')})`).all();
  const updateStmt = db.prepare('UPDATE master_distribusi SET latitude = ?, longitude = ? WHERE id = ?');
  
  const results = [];
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (const item of items) {
    let searchTerms = [];
    if (item.type === 'Fiber Optic') {
      searchTerms = [item.level_4, item.level_3, item.level_1].filter(Boolean);
    } else {
      searchTerms = [item.level_1].filter(Boolean);
    }

    let found = null;
    for (const term of searchTerms) {
      if (term.length < 3) continue;
      found = await geocode(`${term}, Semarang`);
      if (found) break;
      await delay(1000);
    }

    if (found) {
      updateStmt.run(found.latitude, found.longitude, item.id);
      results.push({ id: item.id, success: true, ...found });
    } else {
      results.push({ id: item.id, success: false });
    }
  }

  res.json({ success: true, results });
});

export default router;
