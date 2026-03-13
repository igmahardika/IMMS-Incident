import express from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/escalation', authenticate, (req, res) => {
  const cfg = db.prepare('SELECT * FROM escalation_config LIMIT 1').get();
  res.json(cfg || {});
});

router.put('/escalation', authenticate, authorize('admin', 'manager'), (req, res) => {
  const data = req.body;
  const existing = db.prepare('SELECT id FROM escalation_config LIMIT 1').get();
  
  const segments = ['blue', 'yellow', 'orange', 'red', 'black'];
  const fields = ['type', 'webhook_url', 'webhook_url_vendor', 'is_active', 'template_open', 'template_open_vendor', 'template_close', 'template_close_vendor'];
  segments.forEach(seg => {
    fields.push(`template_open_internal_${seg}`, `template_open_vendor_${seg}`, `template_close_internal_${seg}`, `template_close_vendor_${seg}`);
  });

  if (existing) {
    const sets = fields.map(f => `${f}=?`).join(', ');
    const values = fields.map(f => f === 'is_active' ? (data[f] ? 1 : 0) : (data[f] || null));
    db.prepare(`UPDATE escalation_config SET ${sets}, updated_at=datetime('now') WHERE id=?`).run(...values, existing.id);
  } else {
    const cols = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(f => f === 'is_active' ? (data[f] ? 1 : 0) : (data[f] || null));
    db.prepare(`INSERT INTO escalation_config (${cols}) VALUES (${placeholders})`).run(...values);
  }
  res.json(db.prepare('SELECT * FROM escalation_config LIMIT 1').get());
});

router.post('/escalation/test', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const cfg = db.prepare('SELECT * FROM escalation_config LIMIT 1').get();
  if (!cfg || !cfg.webhook_url) return res.status(400).json({ error: 'No webhook configured' });
  try {
    const text = `🧪 [TEST] IMMS Escalation Test Message - ${new Date().toLocaleString('id-ID')}`;
    const response = await fetch(cfg.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    res.json({ success: response.ok, status: response.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
