import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './config/schema.js';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';
import logger from './utils/logger.js';
import { applyRuntimeSchemaCompatibility } from './database/runtimeCompatibility.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'imms.db');

const sqlite = new Database(DB_PATH);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Wrap the better-sqlite3 instance with Drizzle ORM
export const drizzleDb = drizzle(sqlite, { schema });

// We keep the old SQLite reference as db for legacy queries/seed logic
const db = sqlite;

// CREATE TABLE statements have been migrated to Drizzle ORM schema definitions in ./config/schema.js
// Runtime compatibility patches below are transitional support for older local DB files.
applyRuntimeSchemaCompatibility(db, logger);

// ─── Seed Data ─────────────────────────────────────────────────────────────

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, role, name, email) VALUES (?, ?, ?, ?, ?)'
  );
  insertUser.run('admin', hash('admin123'), 'admin', 'System Admin', 'admin@imms.local');
  insertUser.run('noc1', hash('noc123'), 'noc', 'NOC Operator 1', 'noc1@imms.local');
  insertUser.run('tech1', hash('tech123'), 'technician', 'Budi Santoso', 'tech1@imms.local');
  insertUser.run('tech2', hash('tech123'), 'technician', 'Andi Wijaya', 'tech2@imms.local');
  insertUser.run('manager', hash('manager123'), 'manager', 'Site Manager', 'mgr@imms.local');
  logger.info('✅ Seeded users');
}

const custCount = db.prepare('SELECT COUNT(*) as c FROM master_customer').get().c;
if (custCount === 0) {
  const insertCust = db.prepare(
    'INSERT INTO master_customer (customer_id, service_id, company_name, brand_site, address, service_type, grade, support_level, link_coverage, sla) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insertCust.run('CUST-001', 'SRV-1001', 'PT. Artha Samudra', 'Cabang Palembang', 'Jl. Jend. Sudirman No 1', 'Internet Dedicated', 'Gold', 'L2', 'https://maps.google.com/123', '4 Jam');
  insertCust.run('CUST-002', 'SRV-1002', 'CV. Sinar Jaya', 'Pusat', 'Jl. Veteran No 55', 'VPN IP', 'VIP', 'L3', '', '2 Jam');
  insertCust.run('CUST-003', 'SRV-1003', 'Toko Makmur', 'Cabang OPI', 'OPI Mall Lt 1', 'Broadband', 'Silver', 'L1', '', '8 Jam');
  logger.info('✅ Seeded master_customer');
}

const classCount = db.prepare('SELECT COUNT(*) as c FROM master_classifications').get().c;
if (classCount === 0) {
  const insertClass = db.prepare(
    'INSERT INTO master_classifications (klasifikasi, sub_klasifikasi) VALUES (?, ?)'
  );
  insertClass.run('Kabel Putus', 'Rabas Pohon');
  insertClass.run('Kabel Putus', 'Vandalisme');
  insertClass.run('Kabel Putus', 'Force Majeur (Bencana)');
  insertClass.run('Power Issue', 'PLN Off');
  insertClass.run('Power Issue', 'Genset Bermasalah');
  insertClass.run('Power Issue', 'Adaptor Mati');
  insertClass.run('Perangkat Rusak', 'ONT/Modem Rusak');
  insertClass.run('Perangkat Rusak', 'Port OLT Hang');
  insertClass.run('Link Quality', 'Redaman Tinggi (Bending)');
  insertClass.run('Link Quality', 'Konektor Kotor/Kendor');
  logger.info('✅ Seeded master_classifications');
}

const actionCount = db.prepare('SELECT COUNT(*) as c FROM master_actions').get().c;
if (actionCount === 0) {
  const insertAction = db.prepare('INSERT INTO master_actions (name) VALUES (?)');
  ['Penyambungan Kabel FO', 'Pembersihan Patchcord/Konektor', 'Penggantian Patchcord', 'Penggantian ONT/Modem', 'Reset Port OLY', 'Pencabutan Bending', 'Pemasangan Protektor'].forEach(a => {
    insertAction.run(a);
  });
  logger.info('✅ Seeded master_actions');
}

const escCount = db.prepare('SELECT COUNT(*) as c FROM escalation_config').get().c;
if (escCount === 0) {
  db.prepare(
    'INSERT INTO escalation_config (type, webhook_url, is_active, template_open, template_close, template_open_vendor, template_close_vendor) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    'telegram',
    '',
    0,
    'N-CAL  : {ncal}\nSite  : {company}\nStatus Link  : Down\nODP : {odp}\nSupport Level : {support_level}\nStatus  : OPEN\nProblem : {problem}\nIndikasi : {indikasi}\nDown : {time}',
    '{ncal} [CLOSE] #{case_no}\n📍 Cust: {company}\n🔧 Root Cause: {root_cause}\n⏱ Nett: {duration}\n🕐 Selesai: {time} WIB',
    '{ncal} Maintenance Order\nSite : {brand}\nNomor case : {case_no}\nTanggal case : {date}\nAlamat Customer : {address}\nKoordinat customer : {koordinat}\nNama ODP : {odp}\nPower RX Onu : {power_rx}\nKabel : {kabel}\nTotal Panjang : {panjang_kabel}\nPIC : {pic}\n\nNote : {problem}',
    '{ncal} Selesai MO\nSite : {brand}\nNomor case : {case_no}\nRoot Cause: {root_cause}\nAction: {action}\nNett: {duration}'
  );
}

export default db;
