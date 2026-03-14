import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'imms.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'technician',
    name TEXT NOT NULL,
    email TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

try { db.exec("ALTER TABLE users ADD COLUMN employee_id TEXT;"); } catch(e) {}

const tables = [
  `CREATE TABLE IF NOT EXISTS master_customer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT UNIQUE NOT NULL,
    service_id TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    brand_site TEXT NOT NULL,
    address TEXT,
    service_type TEXT,
    grade TEXT,
    support_level TEXT,
    link_coverage TEXT,
    sla TEXT,
    latitude REAL,
    longitude REAL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS master_classifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    klasifikasi TEXT NOT NULL,
    sub_klasifikasi TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS master_technical_support (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no TEXT,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS master_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS master_distribusi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    level_1 TEXT NOT NULL,
    level_2 TEXT,
    level_3 TEXT,
    level_4 TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_no TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES master_customer(id),
    ncal TEXT NOT NULL DEFAULT 'YELLOW',
    odp_bts TEXT,
    level_support TEXT,
    initial_problem TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    technician_id INTEGER REFERENCES users(id),
    root_cause TEXT,
    last_action TEXT,
    power_before TEXT,
    power_after TEXT,
    kabel TEXT,
    panjang_kabel TEXT,
    pic TEXT,
    indikasi TEXT,
    sla TEXT,
    classification_id INTEGER REFERENCES master_classifications(id),
    start_time TEXT NOT NULL,
    start_action_time TEXT,
    end_time TEXT,
    total_pause_duration_seconds INTEGER NOT NULL DEFAULT 0,
    duration_gross_seconds INTEGER,
    duration_nett_seconds INTEGER,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS pause_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    pause_start TEXT NOT NULL,
    pause_end TEXT,
    reason TEXT,
    duration_seconds INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER REFERENCES incidents(id),
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    details TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    target_role TEXT,
    incident_id INTEGER REFERENCES incidents(id),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS escalation_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'telegram',
    webhook_url TEXT,
    webhook_url_vendor TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    template_open TEXT,
    template_open_vendor TEXT,
    template_close TEXT,
    template_close_vendor TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`
];

tables.forEach(sql => {
  try {
    db.exec(sql);
  } catch (err) {
    console.error(`Error creating table: ${err.message}`);
  }
});

try { db.exec("ALTER TABLE escalation_config ADD COLUMN webhook_url_vendor TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE escalation_config ADD COLUMN template_open_vendor TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE escalation_config ADD COLUMN template_close_vendor TEXT;"); } catch(e) {}

try { db.exec("ALTER TABLE incidents ADD COLUMN kabel TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE incidents ADD COLUMN panjang_kabel TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE incidents ADD COLUMN pic TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE incidents ADD COLUMN indikasi TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE master_customer ADD COLUMN sla TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE incidents ADD COLUMN sla TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE incidents ADD COLUMN customer_terdampak TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE incidents ADD COLUMN koordinat TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE master_customer ADD COLUMN city TEXT;"); } catch(e) {}

// Segment-specific templates migration
const segments = ['blue', 'yellow', 'orange', 'red', 'black'];
segments.forEach(seg => {
  try { db.exec(`ALTER TABLE escalation_config ADD COLUMN template_open_internal_${seg} TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE escalation_config ADD COLUMN template_open_vendor_${seg} TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE escalation_config ADD COLUMN template_close_internal_${seg} TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE escalation_config ADD COLUMN template_close_vendor_${seg} TEXT;`); } catch(e) {}
});

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
  console.log('✅ Seeded users');
}

const custCount = db.prepare('SELECT COUNT(*) as c FROM master_customer').get().c;
if (custCount === 0) {
  const insertCust = db.prepare(
    'INSERT INTO master_customer (customer_id, service_id, company_name, brand_site, address, service_type, grade, support_level, link_coverage, sla) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insertCust.run('CUST-001', 'SRV-1001', 'PT. Artha Samudra', 'Cabang Palembang', 'Jl. Jend. Sudirman No 1', 'Internet Dedicated', 'Gold', 'L2', 'https://maps.google.com/123', '4 Jam');
  insertCust.run('CUST-002', 'SRV-1002', 'CV. Sinar Jaya', 'Pusat', 'Jl. Veteran No 55', 'VPN IP', 'VIP', 'L3', '', '2 Jam');
  insertCust.run('CUST-003', 'SRV-1003', 'Toko Makmur', 'Cabang OPI', 'OPI Mall Lt 1', 'Broadband', 'Silver', 'L1', '', '8 Jam');
  console.log('✅ Seeded master_customer');
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
  console.log('✅ Seeded master_classifications');
}

const actionCount = db.prepare('SELECT COUNT(*) as c FROM master_actions').get().c;
if (actionCount === 0) {
  const insertAction = db.prepare('INSERT INTO master_actions (name) VALUES (?)');
  ['Penyambungan Kabel FO', 'Pembersihan Patchcord/Konektor', 'Penggantian Patchcord', 'Penggantian ONT/Modem', 'Reset Port OLY', 'Pencabutan Bending', 'Pemasangan Protektor'].forEach(a => {
    insertAction.run(a);
  });
  console.log('✅ Seeded master_actions');
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

