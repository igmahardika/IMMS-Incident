import db from '../../db.js';

export function listDistribusi() {
  return db.prepare(`
    SELECT * FROM master_distribusi
    WHERE is_active = 1
    ORDER BY type, level_1, level_2, level_3, level_4
  `).all();
}

export function createDistribusi(payload) {
  const {
    type, level_1, level_2, level_3, level_4,
    survey_latitude, survey_longitude, survey_source, survey_updated_at,
    coord_source, coord_updated_at,
    latitude, longitude,
  } = payload;
  const result = db.prepare(`
    INSERT INTO master_distribusi (
      type, level_1, level_2, level_3, level_4,
      survey_latitude, survey_longitude, survey_source, survey_updated_at,
      coord_source, coord_updated_at,
      latitude, longitude
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    type,
    level_1,
    level_2 || null,
    level_3 || null,
    level_4 || null,
    survey_latitude || null,
    survey_longitude || null,
    survey_source || null,
    survey_updated_at || null,
    coord_source || null,
    coord_updated_at || null,
    latitude || null,
    longitude || null
  );

  return db.prepare('SELECT * FROM master_distribusi WHERE id = ?').get(result.lastInsertRowid);
}

export function batchCreateDistribusi(type, data) {
  const insert = db.prepare(`
    INSERT INTO master_distribusi (type, level_1, level_2, level_3, level_4)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows) => {
    let count = 0;
    for (const row of rows) {
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

  return insertMany(data);
}

export function updateDistribusi(id, payload) {
  const {
    type, level_1, level_2, level_3, level_4,
    survey_latitude, survey_longitude, survey_source, survey_updated_at,
    coord_source, coord_updated_at,
    latitude, longitude, is_active,
  } = payload;
  db.prepare(`
    UPDATE master_distribusi SET
      type = COALESCE(?, type),
      level_1 = COALESCE(?, level_1),
      level_2 = COALESCE(?, level_2),
      level_3 = COALESCE(?, level_3),
      level_4 = COALESCE(?, level_4),
      survey_latitude = COALESCE(?, survey_latitude),
      survey_longitude = COALESCE(?, survey_longitude),
      survey_source = COALESCE(?, survey_source),
      survey_updated_at = COALESCE(?, survey_updated_at),
      coord_source = COALESCE(?, coord_source),
      coord_updated_at = COALESCE(?, coord_updated_at),
      latitude = COALESCE(?, latitude),
      longitude = COALESCE(?, longitude),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    type ?? null,
    level_1 ?? null,
    level_2 ?? null,
    level_3 ?? null,
    level_4 ?? null,
    survey_latitude ?? null,
    survey_longitude ?? null,
    survey_source ?? null,
    survey_updated_at ?? null,
    coord_source ?? null,
    coord_updated_at ?? null,
    latitude ?? null,
    longitude ?? null,
    is_active ?? null,
    id
  );

  return db.prepare('SELECT * FROM master_distribusi WHERE id = ?').get(id);
}

export function deactivateDistribusi(id) {
  db.prepare('UPDATE master_distribusi SET is_active = 0 WHERE id = ?').run(id);
  return { success: true };
}
