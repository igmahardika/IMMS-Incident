# Production Readiness 2026-04-16

Dokumen ini adalah paket readiness operasional untuk IMMS setelah hardening runtime, integrity guardrails, dan regression verification pada 16 April 2026.

## Executive Summary

Status saat ini:
- backend route layer sudah dimodularisasi ke service domain
- startup sekarang memvalidasi konfigurasi runtime kritikal
- readiness endpoint sudah memeriksa database, runtime schema compatibility, dan integritas pending incident
- regression verification sekarang mencakup auth/session, permission guard, incident lifecycle, update guard, dan import validation
- hotspot `Customer Records` sudah dipisah ke modul view yang lebih aman untuk perubahan berikutnya

Verdict saat ini:
- **Conditional Go** untuk internal rollout yang terkontrol
- belum layak dianggap zero-risk production karena masih ada backlog data stewardship dan coverage map/topology yang belum penuh

## Deployment Assumptions

IMMS saat ini mengasumsikan:
- satu backend Node/Express yang mengakses satu file SQLite aktif
- deployment internal jaringan terpercaya, bukan public internet exposure
- frontend dan backend berjalan pada origin yang didaftarkan di `ALLOWED_ORIGINS`
- refresh token dikirim via cookie dengan `credentials: include`
- SQLite tetap dipakai sebagai primary datastore untuk sekarang, dengan mode `WAL`

Asumsi operasional penting:
- hindari multi-writer backend yang menulis ke file SQLite yang sama dari host berbeda
- backup terjadwal wajib ada sebelum volume traffic/ops meningkat
- release sebaiknya tetap single-instance sampai migration strategy formal tersedia

## Required Environment Variables

Minimal yang harus diverifikasi sebelum go-live:

- `NODE_ENV`
- `PORT`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ALLOWED_ORIGINS`

Runtime tuning yang tersedia:
- `TRUST_PROXY`
- `SQLITE_BUSY_TIMEOUT_MS`
- `SQLITE_SYNCHRONOUS`
- `SQLITE_WAL_AUTOCHECKPOINT`
- `BODY_LIMIT_MB`
- `REQUEST_TIMEOUT_MS`
- `KEEP_ALIVE_TIMEOUT_MS`

Production rules:
- `JWT_SECRET` dan `REFRESH_TOKEN_SECRET` wajib diisi
- secret default development tidak boleh dipakai di production
- `ALLOWED_ORIGINS` wajib diisi origin frontend yang sah

## Runtime Expectations

Startup backend sekarang:
- memvalidasi env dengan `zod`
- menerapkan SQLite pragmas:
  - `journal_mode = WAL`
  - `foreign_keys = ON`
  - `busy_timeout`
  - `synchronous`
  - `wal_autocheckpoint`
  - `temp_store = MEMORY`
- menjalankan query heartbeat database saat startup
- mengaktifkan graceful shutdown untuk `SIGINT` dan `SIGTERM`
- mencatat `unhandledRejection` dan `uncaughtException`, lalu mematikan proses secara terkontrol

Health endpoints:
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/health`

Readiness memeriksa:
- heartbeat database
- runtime schema compatibility
- integritas incident state terhadap pause log terbuka

## Operational Validation Commands

Gunakan command berikut sebelum release:

```bash
npm run lint
npm run build
npm run backup:db
npm run verify:backup
npm run verify:backend
npm run verify:db
npm run verify:production
```

Makna command:
- `lint`: guard source quality
- `build`: memastikan bundle frontend valid
- `backup:db`: membuat backup SQLite konsisten dan manifest metadata
- `verify:backup`: memastikan backup terbaru bisa dibuka, lolos integrity check, dan cocok secara row count dengan live DB saat backup dibuat
- `verify:backend`: smoke verification service layer
- `verify:db`: memastikan runtime schema governance tetap sesuai
- `verify:production`: memverifikasi auth/session, permission guard, lifecycle transition, update guard, dan import validation

## Release Checklist

Sebelum deploy:
1. pastikan branch release bersih dan commit hash tercatat
2. jalankan semua validation command di atas
3. cek `GET /api/health/ready` di environment target
4. verifikasi `ALLOWED_ORIGINS`, `JWT_SECRET`, dan `REFRESH_TOKEN_SECRET`
5. jalankan `npm run backup:db`
6. jalankan `npm run verify:backup`
7. cek `GET /api/incidents/integrity` untuk memastikan tidak ada anomaly:
   - `pendingWithoutOpenPause`
   - `openPauseWithoutPending`
   - `doneWithOpenPause`
8. pastikan pending queue yang tersisa memang valid secara operasional
9. verifikasi login admin dan satu role non-admin di environment target
10. verifikasi create -> start -> pause -> resume -> close pada incident test jika environment mengizinkan

Sesudah deploy:
1. hit `GET /api/health/live`
2. hit `GET /api/health/ready`
3. buka dashboard dan current trouble
4. verifikasi login + refresh session
5. verifikasi notification bell dan satu action incident

## Backup / Restore / DB Recovery Guidance

### Backup

Untuk SQLite internal ini, prosedur aman yang direkomendasikan:

1. jalankan `npm run backup:db`
2. simpan artefak `.db` dan file manifest `.json` hasil backup
3. jika menjelang release penting, jalankan juga `npm run verify:backup`

Catatan:
- backup sekarang memakai SQLite backup API melalui `better-sqlite3`, sehingga lebih aman daripada copy file raw biasa
- backup tetap harus dijalankan pada host yang memegang file DB aktif

### Restore

1. hentikan backend
2. simpan salinan file DB bermasalah sebagai bukti forensik
3. restore file backup `.db` ke `imms.db`
4. start backend
5. cek:
   - `GET /api/health/ready`
   - `npm run verify:backup -- /path/to/restored-backup.db`
   - `npm run verify:db`
   - `GET /api/incidents/integrity`

### Recovery Confidence Notes

Karena sistem masih memakai SQLite:
- recovery cepat untuk single-instance cukup baik
- tetapi HA/write concurrency lintas host belum menjadi target arsitektur saat ini
- recovery automation dasar sekarang sudah ada, tetapi recovery drill formal tetap wajib dilakukan berkala

## Rollback Guidance

Jika release baru bermasalah:
1. hentikan backend baru
2. rollback code ke commit release sebelumnya
3. jika ada mutasi data yang tidak diinginkan, restore DB dari backup pre-release
4. jalankan:
   - `npm run verify:db`
   - `npm run verify:backend`
5. hidupkan backend rollback
6. verifikasi health endpoint dan login

Rollback minimum tanpa restore DB masih memungkinkan bila:
- perubahan hanya menyentuh frontend atau route/controller tanpa mutasi skema/data

Rollback dengan restore DB wajib dipertimbangkan bila:
- ada import massal
- ada cleanup/delete besar
- ada patch schema/runtime yang gagal

## Current Hardening Improvements

Perubahan material yang sekarang aktif:
- env/runtime validation di `server/config/runtime.js`
- safer startup + graceful shutdown di `server/index.js`
- centralized HTTP error handling
- stricter origin allowlist
- SQLite pragmas + startup heartbeat di `server/db.js`
- readiness/liveness endpoint
- formal production verification script
- script backup SQLite konsisten + restore verification
- stewardship report endpoint untuk backlog customer/topology dan pending queue integrity
- incident integrity summary + route
- update schema sekarang benar-benar menormalisasi payload dan memblokir status mutation generik
- `Customer Records` dipecah ke modul-modul terfokus untuk menurunkan maintainability risk

## Known Remaining Blockers

High-priority blockers yang masih tersisa sebelum menyebut sistem ini fully hardened:

1. Data stewardship backlog masih nyata
- customer workbook unmatched rows masih tinggi
- topology unmatched labels masih ada
- ini bukan bug runtime, tapi beban operasional data quality

2. Map-heavy modules masih kompleks walaupun sudah dimodularisasi
- state/orchestration utama sudah lebih kecil
- tetapi logic spasial dan UX map tetap area yang butuh kehati-hatian

3. SQLite tetap single-node assumption
- aman untuk internal controlled deployment
- belum ideal untuk scale-out / HA requirement

4. Stewardship visibility baru ada di backend/report layer
- route `GET /api/master/stewardship-report` sekarang tersedia
- dashboard admin khusus backlog stewardship belum dibuat

## Current Go-Live Recommendation

**Conditional Go**

Layak untuk:
- internal NOC rollout
- traffic terkontrol
- single backend instance
- backup discipline yang dijalankan
- release checklist dipatuhi

Belum layak untuk:
- multi-instance write-heavy deployment
- external/public exposure tanpa tambahan security/perimeter review
- go-live tanpa backup dan health-check discipline

## Recommended Next 30-Day Roadmap

### Week 1
- hubungkan `npm run backup:db` ke scheduler/cron host
- lakukan recovery drill formal minimal sekali
- tambahkan checklist release menjadi prosedur tim

### Week 2
- pecah `DistribusiPage` dan minimal satu komponen map-heavy besar
- tambah regression verification untuk master data update edge cases

### Week 3
- audit dan kurangi unmatched topology/customer backlog
- tambahkan visibility dashboard/admin untuk unmatched stewardship queue bila diperlukan

### Week 4
- evaluasi apakah SQLite masih cukup untuk target operasional 60-90 hari berikutnya
- jika tidak, siapkan proposal migration path yang kecil dan aman, bukan rewrite besar

## Evidence Snapshot

Validation terakhir pada hardening pass ini:
- `npm run lint` passed
- `npm run build` passed
- `npm run verify:backend` passed
- `npm run verify:db` passed
- `npm run verify:production` passed

Integrity snapshot:
- `pendingWithoutOpenPause = 0`
- `openPauseWithoutPending = 0`
- `doneWithOpenPause = 0`

Artinya queue `pending` yang ada saat ini valid secara workflow, bukan anomaly data yang langsung menghalangi release.
