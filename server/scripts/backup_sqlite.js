import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import db, { DB_PATH } from '../db.js';

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const backupDir = process.env.BACKUP_DIR || path.join('/tmp', 'imms-backups');
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

  console.log(JSON.stringify({
    success: true,
    backupPath,
    manifestPath,
    integrity,
    tables,
  }, null, 2));
}

main().catch((error) => {
  console.error('SQLite backup failed:', error);
  process.exit(1);
});
