import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../..', 'imms.db');
const db = new Database(DB_PATH);

console.log('🧹 Resetting city names to trigger re-normalization...');

const result = db.prepare("UPDATE master_customer SET city = NULL").run();

console.log(`✅ Reset complete. ${result.changes} records will now be re-synced with normalized city/regency names.`);

process.exit(0);
