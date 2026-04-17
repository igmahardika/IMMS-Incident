import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import db from '../db.js';

function getLatestBackup(dir) {
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir)
    .filter((file) => file.startsWith('imms-backup-') && file.endsWith('.db'))
    .sort()
    .reverse();

  return files.length ? path.join(dir, files[0]) : null;
}

function readCount(database, table) {
  return database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

function main() {
  const backupDir = process.env.BACKUP_DIR || path.join('/tmp', 'imms-backups');
  const backupPath = process.argv[2] || getLatestBackup(backupDir);

  if (!backupPath || !fs.existsSync(backupPath)) {
    throw new Error('No backup file found. Run npm run backup:db first or provide an explicit backup path.');
  }

  const liveCounts = {
    users: readCount(db, 'users'),
    incidents: readCount(db, 'incidents'),
    master_customer: readCount(db, 'master_customer'),
    master_distribusi: readCount(db, 'master_distribusi'),
  };

  const backupDb = new Database(backupPath, { readonly: true });
  const integrity = backupDb.pragma('integrity_check', { simple: true });
  const backupCounts = {
    users: readCount(backupDb, 'users'),
    incidents: readCount(backupDb, 'incidents'),
    master_customer: readCount(backupDb, 'master_customer'),
    master_distribusi: readCount(backupDb, 'master_distribusi'),
  };
  backupDb.close();

  const countsMatch = Object.keys(liveCounts).every((key) => liveCounts[key] === backupCounts[key]);
  if (integrity !== 'ok') {
    throw new Error(`Backup integrity check failed: ${integrity}`);
  }
  if (!countsMatch) {
    throw new Error(`Backup row counts do not match live DB. live=${JSON.stringify(liveCounts)} backup=${JSON.stringify(backupCounts)}`);
  }

  console.log(JSON.stringify({
    success: true,
    backupPath,
    integrity,
    liveCounts,
    backupCounts,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error('Backup restore verification failed:', error.message);
  process.exit(1);
}
