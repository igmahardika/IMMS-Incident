function getColumnNames(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name));
}

function ensureTable(db, table, createSql) {
  db.prepare(createSql).run();
  return { type: 'table', table, ensured: true };
}

function ensureColumns(db, table, definitions) {
  const existing = getColumnNames(db, table);
  const added = [];

  for (const definition of definitions) {
    const [columnName] = definition.split(/\s+/);
    if (!existing.has(columnName)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${definition}`).run();
      added.push(columnName);
    }
  }

  return { type: 'columns', table, added };
}

export const RUNTIME_SCHEMA_PATCHES = [
  {
    id: 'metadata-table',
    description: 'Ensure metadata table exists for geocoder cache/runtime metadata.',
    apply: (db) => ensureTable(
      db,
      'metadata',
      `
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `
    ),
  },
  {
    id: 'master-customer-geocode-columns',
    description: 'Ensure geocode and SLA columns exist on legacy master_customer databases.',
    apply: (db) => ensureColumns(db, 'master_customer', [
      'sla TEXT',
      'latitude REAL',
      'longitude REAL',
      'city TEXT',
      'province TEXT',
    ]),
  },
  {
    id: 'master-customer-survey-columns',
    description: 'Ensure survey/reference fields exist on master_customer.',
    apply: (db) => ensureColumns(db, 'master_customer', [
      'osc_reference TEXT',
      'odc_reference TEXT',
      'odp_reference TEXT',
      'survey_name_raw TEXT',
      'survey_latitude REAL',
      'survey_longitude REAL',
      'survey_source TEXT',
      'survey_updated_at TEXT',
      'coord_source TEXT',
      'coord_updated_at TEXT',
    ]),
  },
  {
    id: 'master-distribusi-survey-columns',
    description: 'Ensure survey/reference fields exist on master_distribusi.',
    apply: (db) => ensureColumns(db, 'master_distribusi', [
      'survey_latitude REAL',
      'survey_longitude REAL',
      'survey_source TEXT',
      'survey_updated_at TEXT',
      'coord_source TEXT',
      'coord_updated_at TEXT',
    ]),
  },
];

export function applyRuntimeSchemaCompatibility(db, logger) {
  const results = [];

  for (const patch of RUNTIME_SCHEMA_PATCHES) {
    const result = patch.apply(db);
    results.push({ ...result, id: patch.id, description: patch.description });
  }

  const appliedMessages = results.flatMap((result) => {
    if (result.type === 'table' && result.ensured) {
      return [`runtime patch ensured table ${result.table}`];
    }
    if (result.type === 'columns' && result.added.length > 0) {
      return [`runtime patch added columns on ${result.table}: ${result.added.join(', ')}`];
    }
    return [];
  });

  for (const message of appliedMessages) {
    logger.info(`[DB] ${message}`);
  }

  return results;
}

export function getRuntimeSchemaPatchStatus(db) {
  return RUNTIME_SCHEMA_PATCHES.map((patch) => {
    if (patch.id === 'metadata-table') {
      const exists = Boolean(db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'metadata'
      `).get());
      return { id: patch.id, description: patch.description, ok: exists };
    }

    if (patch.id === 'master-customer-geocode-columns') {
      const existing = getColumnNames(db, 'master_customer');
      const expected = ['sla', 'latitude', 'longitude', 'city', 'province'];
      const missing = expected.filter((column) => !existing.has(column));
      return {
        id: patch.id,
        description: patch.description,
        ok: missing.length === 0,
        missing,
      };
    }

    if (patch.id === 'master-customer-survey-columns') {
      const existing = getColumnNames(db, 'master_customer');
      const expected = [
        'osc_reference',
        'odc_reference',
        'odp_reference',
        'survey_name_raw',
        'survey_latitude',
        'survey_longitude',
        'survey_source',
        'survey_updated_at',
        'coord_source',
        'coord_updated_at',
      ];
      const missing = expected.filter((column) => !existing.has(column));
      return {
        id: patch.id,
        description: patch.description,
        ok: missing.length === 0,
        missing,
      };
    }

    if (patch.id === 'master-distribusi-survey-columns') {
      const existing = getColumnNames(db, 'master_distribusi');
      const expected = [
        'survey_latitude',
        'survey_longitude',
        'survey_source',
        'survey_updated_at',
        'coord_source',
        'coord_updated_at',
      ];
      const missing = expected.filter((column) => !existing.has(column));
      return {
        id: patch.id,
        description: patch.description,
        ok: missing.length === 0,
        missing,
      };
    }

    return { id: patch.id, description: patch.description, ok: false };
  });
}
