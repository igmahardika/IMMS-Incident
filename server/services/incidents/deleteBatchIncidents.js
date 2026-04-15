import db from '../../db.js';
import { cleanupLegacyImportArtifacts } from './cleanupLegacyImportArtifacts.js';

function deleteChunk(table, ids) {
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(`DELETE FROM ${table} WHERE incident_id IN (${placeholders})`).run(...ids);
}

function deleteIncidentChunk(ids) {
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(`DELETE FROM incidents WHERE id IN (${placeholders})`).run(...ids);
}

export function deleteBatchIncidents(ids) {
  const runBatch = db.transaction((incidentIds) => {
    const chunkSize = 200;
    let deleted = 0;

    for (let index = 0; index < incidentIds.length; index += chunkSize) {
      const chunk = incidentIds.slice(index, index + chunkSize);
      deleteChunk('notifications', chunk);
      deleteChunk('pause_logs', chunk);
      deleteChunk('audit_logs', chunk);
      deleted += deleteIncidentChunk(chunk).changes;
    }

    const cleanup = cleanupLegacyImportArtifacts();
    return { deleted, ...cleanup };
  });

  return runBatch(ids);
}
