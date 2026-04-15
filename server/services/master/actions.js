import db from '../../db.js';

export function listActions() {
  return db.prepare(`
    SELECT * FROM master_actions
    WHERE is_active = 1
    ORDER BY name
  `).all();
}

export function createAction({ name }) {
  const result = db.prepare('INSERT INTO master_actions (name) VALUES (?)').run(name);
  return db.prepare('SELECT * FROM master_actions WHERE id = ?').get(result.lastInsertRowid);
}

export function updateAction(id, { name, is_active }) {
  db.prepare(`
    UPDATE master_actions
    SET name = COALESCE(?, name), is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name ?? null, is_active ?? null, id);

  return db.prepare('SELECT * FROM master_actions WHERE id = ?').get(id);
}
