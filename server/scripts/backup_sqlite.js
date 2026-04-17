import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import db, { DB_PATH } from '../db.js';

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function pruneBackups(backupDir, keepCount, retentionDays) {
  const files = fs.readdirSync(backupDir)
    .filter((file) => file.startsWith('imms-backup-') && file.endsWith('.db'))
    .map((file) => {
      const fullPath = path.join(backupDir, file);
      return {
        file,
        fullPath,
        stat: fs.statSync(fullPath),
      };
    })
    .sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);

  const cutoff = retentionDays > 0
    ? Date.now() - (retentionDays * 24 * 60 * 60 * 1000)
    : null;

  const deleted = [];
  files.forEach((entry, index) => {
    const beyondKeepCount = keepCount > 0 && index >= keepCount;
    const beyondRetention = cutoff !== null && entry.stat.mtimeMs < cutoff;

    if (!beyondKeepCount && !beyondRetention) return;

    const manifestPath = `${entry.fullPath}.json`;
    fs.rmSync(entry.fullPath, { force: true });
    fs.rmSync(manifestPath, { force: true });
    deleted.push(path.basename(entry.fullPath));
  });

  return deleted;
}

async function main() {
  const backupDir = process.env.BACKUP_DIR || path.join('/tmp', 'imms-backups');
  const keepCount = Number.parseInt(process.env.BACKUP_KEEP_COUNT || '14', 10);
  const retentionDays = Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
  fs.mkdirSync(backupDir, { recursive: true });

  const backupPath = path.join(backupDir, `imms-backup-${stamp()}.db`);
  const manifestPath = `${backupPath}.json`;

  await db.backup(backupPath);

  const backupDb = new Database(backupPath, { readonly: true });
  const integrity = backupDb.pragma('integrity_check', { simple: true });
  const tables = {
    users: backupDb.prepare('SELECT COUNT(*) AS count FROM users').get().count,
    incidents: backupDb.prepare('SELECT COUNT(*) AS count FROM incidents').get().count,
    master_customer: backupDb.prepare('SELECT COUNT(*) AS count FROM master_customer').get().count,
    master_distribusi: backupDb.prepare('SELECT COUNT(*) AS count FROM master_distribusi').get().count,
  };
  backupDb.close();

  const sizeBytes = fs.statSync(backupPath).size;
  const manifest = {
    createdAt: new Date().toISOString(),
    sourceDbPath: DB_PATH,
    backupPath,
    sizeBytes,
    integrity,
    tables,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const prunedBackups = pruneBackups(backupDir, Number.isNaN(keepCount) ? 14 : keepCount, Number.isNaN(retentionDays) ? 30 : retentionDays);

  console.log(JSON.stringify({
    success: true,
    backupPath,
    manifestPath,
    integrity,
    tables,
    backupRetention: {
      keepCount: Number.isNaN(keepCount) ? 14 : keepCount,
      retentionDays: Number.isNaN(retentionDays) ? 30 : retentionDays,
      prunedBackups,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error('SQLite backup failed:', error);
  process.exit(1);
});
