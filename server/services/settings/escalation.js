import db from '../../db.js';

const ESCALATION_SEGMENTS = ['blue', 'yellow', 'orange', 'red', 'black'];
const ESCALATION_FIELDS = [
  'type',
  'webhook_url',
  'webhook_url_vendor',
  'is_active',
  'template_open',
  'template_open_vendor',
  'template_close',
  'template_close_vendor',
];

for (const segment of ESCALATION_SEGMENTS) {
  ESCALATION_FIELDS.push(
    `template_open_internal_${segment}`,
    `template_open_vendor_${segment}`,
    `template_close_internal_${segment}`,
    `template_close_vendor_${segment}`,
  );
}

function mapEscalationValues(payload) {
  return ESCALATION_FIELDS.map((field) => (field === 'is_active' ? (payload[field] ? 1 : 0) : (payload[field] || null)));
}

export function getEscalationConfig() {
  return db.prepare('SELECT * FROM escalation_config LIMIT 1').get() || {};
}

export function upsertEscalationConfig(payload) {
  const existing = db.prepare('SELECT id FROM escalation_config LIMIT 1').get();
  const values = mapEscalationValues(payload);

  if (existing) {
    const sets = ESCALATION_FIELDS.map((field) => `${field} = ?`).join(', ');
    db.prepare(`UPDATE escalation_config SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...values, existing.id);
  } else {
    const columns = ESCALATION_FIELDS.join(', ');
    const placeholders = ESCALATION_FIELDS.map(() => '?').join(', ');
    db.prepare(`INSERT INTO escalation_config (${columns}) VALUES (${placeholders})`).run(...values);
  }

  return getEscalationConfig();
}

export async function sendEscalationTest() {
  const config = getEscalationConfig();
  if (!config?.webhook_url) {
    const error = new Error('No webhook configured');
    error.status = 400;
    throw error;
  }

  const text = `🧪 [TEST] IMMS Escalation Test Message - ${new Date().toLocaleString('id-ID')}`;
  const response = await fetch(config.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  return { success: response.ok, status: response.status };
}
