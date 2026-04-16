# IMMS

IMMS adalah aplikasi incident management untuk operasi NOC. Project ini mencakup:

- registrasi incident baru
- monitoring incident aktif
- pause, resume, update, dan close workflow
- resolved incident archive
- analytics dashboard dan report
- master data customer, klasifikasi, topology, dan personnel
- geocode customer/topology untuk mode map
- escalation webhook dan notification

## Stack

- Frontend: React 19, Vite, React Router, React Query, Recharts, Leaflet, Socket.IO client
- Backend: Express 5, better-sqlite3, Socket.IO, Zod
- Database: SQLite (`imms.db`)
- UI foundation: Tailwind CSS + shadcn-style component layer

## Menjalankan Project

### 1. Install dependency

```bash
npm install
```

### 2. Jalankan backend

```bash
node server/index.js
```

Backend default berjalan di `http://localhost:3001`.

### 3. Jalankan frontend

```bash
npm run dev
```

Frontend default berjalan di `http://localhost:5173`.

## Script Penting

```bash
npm run dev
npm run build
npm run lint
npm run verify:backend
npm run verify:db
npm run verify:production
```

Penjelasan:

- `build`: memastikan bundle frontend valid
- `lint`: memastikan source konsisten
- `verify:backend`: smoke check service layer backend
- `verify:db`: verifikasi governance runtime schema patch
- `verify:production`: verifikasi auth/session, permission guard, incident lifecycle, update guard, dan import validation

## Runtime Configuration

Runtime sekarang memvalidasi konfigurasi startup. Variabel berikut didukung:

- `NODE_ENV`
- `PORT`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ALLOWED_ORIGINS`
- `TRUST_PROXY`
- `SQLITE_BUSY_TIMEOUT_MS`
- `SQLITE_SYNCHRONOUS`
- `SQLITE_WAL_AUTOCHECKPOINT`
- `BODY_LIMIT_MB`
- `REQUEST_TIMEOUT_MS`
- `KEEP_ALIVE_TIMEOUT_MS`

Catatan penting:

- di `production`, `JWT_SECRET` dan `REFRESH_TOKEN_SECRET` wajib diisi dan tidak boleh memakai fallback development
- `ALLOWED_ORIGINS` sebaiknya diisi daftar origin frontend yang dipisah koma
- jika `ALLOWED_ORIGINS` tidak diisi di local dev, backend memakai default localhost origin

## Health Endpoints

- `GET /api/health/live`
  Untuk liveness sederhana
- `GET /api/health/ready`
  Untuk readiness yang memeriksa:
  - koneksi database
  - runtime schema compatibility
  - integritas pending incident terhadap pause log terbuka
- `GET /api/health`
  Alias readiness

## Struktur Modul Utama

- `src/App.jsx`: route tree frontend
- `src/components/layout/*`: app shell
- `src/pages/*`: halaman operasional, analytics, master, settings
- `src/components/ui/*`: shared UI layer
- `server/index.js`: bootstrap backend
- `server/routes/*`: thin controller layer
- `server/services/*`: service domain backend
- `server/db.js`: bootstrap database
- `server/database/runtimeCompatibility.js`: runtime compatibility patch inventory

## Area Fitur

- `Create Incident`: `/incidents/create`
- `Active Troubles`: `/incidents`
- `Incident Detail`: `/incidents/:id`
- `Resolved Incidents`: `/history`
- `Monthly Analysis`: `/monthly`
- `Dashboard`: `/dashboard`
- `Duration Intelligence`: `/duration-report`
- `Root Cause`: `/root-cause`
- `Customers`: `/master/customers`
- `Classifications`: `/master/classifications`
- `Distribution Topology`: `/master/distribusi`
- `Personnel & Accounts`: `/master/users`
- `Escalation Settings`: `/settings/escalation`

## Data & Import

- workbook manual resolved history disimpan di folder [MANUAL DATA](/Users/macbookair/Documents/IMMS/MANUAL%20DATA)
- import history dilakukan dari halaman `Resolved Incidents`
- delete batch archive sekarang juga membersihkan artefak legacy import agar upload ulang tidak tumpang tindih

## Dokumentasi Lanjutan

- [docs/ARCHITECTURE.md](/Users/macbookair/Documents/IMMS/docs/ARCHITECTURE.md)
- [docs/CURRENT_STATE_AUDIT.md](/Users/macbookair/Documents/IMMS/docs/CURRENT_STATE_AUDIT.md)
- [docs/PRIORITY_FINDINGS_2026-04-15.md](/Users/macbookair/Documents/IMMS/docs/PRIORITY_FINDINGS_2026-04-15.md)
- [docs/REFACTOR_ROADMAP_2026-04-15.md](/Users/macbookair/Documents/IMMS/docs/REFACTOR_ROADMAP_2026-04-15.md)
- [docs/FEATURE_MAP.md](/Users/macbookair/Documents/IMMS/docs/FEATURE_MAP.md)
- [docs/PRODUCTION_READINESS_2026-04-16.md](/Users/macbookair/Documents/IMMS/docs/PRODUCTION_READINESS_2026-04-16.md)

## Catatan Operasional

- refresh token dipakai melalui `credentials: include`
- notifikasi sekarang socket-aware, bukan polling murni
- geocode customer dan topology punya report readiness di UI map
- route backend utama sudah dimodularisasi ke service layer
