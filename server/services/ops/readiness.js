import db from '../../db.js';
import { getRuntimeSchemaPatchStatus } from '../../database/runtimeCompatibility.js';
import { runtimeConfig, runtimeWarnings } from '../../config/runtime.js';
import { getIncidentIntegritySummary } from '../incidents/integrity.js';

export function getLivenessStatus() {
  return {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
    env: runtimeConfig.NODE_ENV,
  };
}

export function getReadinessStatus() {
  const patchStatus = getRuntimeSchemaPatchStatus(db);
  const dbHeartbeat = db.prepare('SELECT 1 AS ok').get();
  const integrity = getIncidentIntegritySummary();

  const checks = {
    database: Boolean(dbHeartbeat?.ok === 1),
    runtimeSchema: patchStatus.every((item) => item.ok),
    pendingIntegrity: integrity.summary.pendingWithoutOpenPause === 0
      && integrity.summary.openPauseWithoutPending === 0
      && integrity.summary.doneWithOpenPause === 0,
  };

  return {
    status: Object.values(checks).every(Boolean) ? 'ready' : 'degraded',
    checks,
    runtime: {
      env: runtimeConfig.NODE_ENV,
      allowedOrigins: runtimeConfig.ALLOWED_ORIGINS_LIST,
      warnings: runtimeWarnings,
    },
    database: {
      journalMode: db.pragma('journal_mode', { simple: true }),
      foreignKeys: db.pragma('foreign_keys', { simple: true }),
      busyTimeoutMs: runtimeConfig.SQLITE_BUSY_TIMEOUT_MS,
      synchronous: runtimeConfig.SQLITE_SYNCHRONOUS,
      runtimeSchemaPatches: patchStatus,
    },
    incidents: {
      ...integrity.summary,
      samples: integrity.samples,
    },
    time: new Date().toISOString(),
  };
}
