import db from '../../db.js';

export function listClassifications() {
  return db.prepare(`
    SELECT * FROM master_classifications
    WHERE is_active = 1
    ORDER BY klasifikasi, sub_klasifikasi
  `).all();
}

export function createClassification({ klasifikasi, sub_klasifikasi }) {
  const result = db.prepare(`
    INSERT INTO master_classifications (klasifikasi, sub_klasifikasi)
    VALUES (?, ?)
  `).run(klasifikasi, sub_klasifikasi);

  return db.prepare('SELECT * FROM master_classifications WHERE id = ?').get(result.lastInsertRowid);
}

export function updateClassification(id, { klasifikasi, sub_klasifikasi, is_active }) {
  db.prepare(`
    UPDATE master_classifications
    SET klasifikasi = COALESCE(?, klasifikasi),
        sub_klasifikasi = COALESCE(?, sub_klasifikasi),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(klasifikasi ?? null, sub_klasifikasi ?? null, is_active ?? null, id);

  return db.prepare('SELECT * FROM master_classifications WHERE id = ?').get(id);
}

export function deactivateClassification(id) {
  db.prepare('UPDATE master_classifications SET is_active = 0 WHERE id = ?').run(id);
  return { success: true };
}
