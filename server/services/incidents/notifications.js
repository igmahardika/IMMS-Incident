import db from '../../db.js';

export function markNotificationRead(id) {
  const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  return { success: true, updated: result.changes };
}
