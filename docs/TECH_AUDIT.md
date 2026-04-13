# IMMS Technical Audit

## Scope

Audit ini disusun dari pembacaan source code frontend dan backend, dengan fokus pada bug potensial, inkonsistensi teknis, dan area yang berisiko menimbulkan regression.

## Priority Findings

### P1. `master_customer` route memakai kolom `latitude` dan `longitude`, tetapi schema tidak mendefinisikannya

Lokasi terkait:

- [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js)
- [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)
- [src/pages/master/CustomersPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/CustomersPage.jsx)

Masalah:

- Route customer melakukan query `WHERE latitude IS NULL`, update `SET latitude = ?, longitude = ?`, dan UI juga membaca field ini.
- Namun schema `master_customer` yang ada tidak memiliki kolom `latitude` dan `longitude`.

Dampak:

- Installasi baru atau migrasi yang patuh schema bisa gagal pada fitur geocoding, map, atau halaman customer.
- Ada risiko mismatch antara database aktual dengan migrasi resmi.

Rekomendasi:

- Tambahkan kolom ke schema dan migrasi resmi, atau hapus semua penggunaan field tersebut bila memang sudah deprecated.

### P1. Geocoder bergantung pada tabel `metadata`, tetapi tabel itu tidak ada di schema/migrasi

Lokasi terkait:

- [server/utils/geocoder.js](/Users/macbookair/Documents/IMMS/server/utils/geocoder.js)
- [server/migrations/0000_famous_firelord.sql](/Users/macbookair/Documents/IMMS/server/migrations/0000_famous_firelord.sql)
- [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js)

Masalah:

- `waitIfNeeded()` membaca dan meng-update `metadata.last_geocoding_time`.
- Tidak ada definisi tabel `metadata` di schema atau migration yang terbaca.

Dampak:

- Auto-geocode customer/distribusi berpotensi langsung error pada runtime di environment baru.

Rekomendasi:

- Tambahkan tabel `metadata`, atau ganti mekanisme rate-limit lokal agar tidak tergantung tabel yang tidak ada.

### P1. Frontend memakai field `site_name_manual`, tetapi schema incident tidak memilikinya

Lokasi terkait:

- [src/pages/CreateIncidentPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CreateIncidentPage.jsx)
- [src/pages/CurrentTroublePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CurrentTroublePage.jsx)
- [src/pages/IncidentDetailPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/IncidentDetailPage.jsx)
- [src/pages/DashboardPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DashboardPage.jsx)
- [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js)

Masalah:

- Form create/edit mengelola `site_name_manual` dan beberapa page juga menampilkannya.
- Schema incident tidak punya field tersebut, dan insert/update backend juga tidak menyimpannya.

Dampak:

- Informasi tampilan bisa hilang setelah save/load.
- UI dan data persistence tidak sinkron.

Rekomendasi:

- Putuskan apakah `site_name_manual` memang dibutuhkan.
- Jika ya, tambah ke schema dan persistence backend.
- Jika tidak, hapus penggunaannya dan standarkan ke `brand_site`/`company_name`/`odp_bts`.

### P1. Flow refresh token ada di backend, tetapi tidak dipakai di frontend

Lokasi terkait:

- [server/routes/auth.js](/Users/macbookair/Documents/IMMS/server/routes/auth.js)
- [src/context/AuthContext.jsx](/Users/macbookair/Documents/IMMS/src/context/AuthContext.jsx)
- [src/utils/api.js](/Users/macbookair/Documents/IMMS/src/utils/api.js)

Masalah:

- Backend menerapkan access token 15 menit dan refresh token 7 hari.
- Frontend hanya menyimpan access token di `localStorage`, lalu langsung logout saat `401`.

Dampak:

- Session architecture tidak konsisten.
- User bisa terputus mendadak walau refresh token sebenarnya masih valid.

Rekomendasi:

- Implement retry refresh token di API client, atau sederhanakan backend dengan menghapus flow refresh bila belum ingin dipakai.

### P1. Status incident yang divalidasi Zod tidak sepenuhnya sama dengan status yang dipakai route

Lokasi terkait:

- [server/utils/validators.js](/Users/macbookair/Documents/IMMS/server/utils/validators.js)
- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)

Masalah:

- Zod create schema mengenal `open`, `progress`, `resolved`, `closed`.
- Route dan query backend nyata memakai `open`, `progress`, `pending`, `done`.

Dampak:

- Kontrak API menjadi ambigu.
- Validasi bisa membolehkan status yang tidak dipakai atau melarang status yang dibutuhkan.

Rekomendasi:

- Samakan enum status di seluruh lapisan: schema Zod, route handler, UI badges, dan analytics query.

## Medium Priority Findings

### P2. Route incident sangat gemuk dan memuat banyak domain logic

Lokasi:

- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)

Masalah:

- Satu file menangani query listing, detail, create, update, lifecycle action, escalation template selection, recurring logic, batch delete, dan notification side effects.

Dampak:

- Sulit dites.
- Sulit direfactor tanpa regression.

Rekomendasi:

- Pisahkan menjadi service layer:
  - incident service
  - escalation service
  - notification service
  - incident query/repository

### P2. Banyak operasi CRUD masih memakai raw SQL walau schema sudah dipindah ke Drizzle

Lokasi:

- [server/db.js](/Users/macbookair/Documents/IMMS/server/db.js)
- Seluruh file route di `server/routes/`

Masalah:

- Schema formal ada, tetapi runtime query masih SQL string.

Dampak:

- Tipe data dan naming lebih mudah drift.
- Refactor schema lebih mahal.

Rekomendasi:

- Migrasikan secara bertahap route kritis ke akses data yang konsisten.

### P2. Hardcoded API base URL mengasumsikan backend selalu di port `3001`

Lokasi:

- [src/utils/api.js](/Users/macbookair/Documents/IMMS/src/utils/api.js)

Masalah:

- `const BASE = http://${window.location.hostname}:3001/api`

Dampak:

- Deployment di reverse proxy, port berbeda, atau path non-standar akan sulit.

Rekomendasi:

- Gunakan `import.meta.env.VITE_API_URL` dengan fallback yang aman.

### P2. Notification polling dan socket berjalan bersamaan tanpa strategi deduplikasi yang jelas

Lokasi:

- [src/components/ui/NotificationBell.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/NotificationBell.jsx)
- [src/hooks/useSocket.js](/Users/macbookair/Documents/IMMS/src/hooks/useSocket.js)

Masalah:

- Notification memakai polling 10 detik.
- Incident list memakai socket invalidation.
- Tidak ada strategi menyatukan realtime event untuk notification.

Dampak:

- Trafik dan refetch lebih boros.
- Realtime model jadi campuran.

Rekomendasi:

- Jika socket sudah stabil, pertimbangkan push notification via socket juga.

### P2. DataTable reusable masih sangat UI-driven dan belum mendukung kebutuhan data selection secara konsisten

Lokasi:

- [src/components/tables/DataTable.jsx](/Users/macbookair/Documents/IMMS/src/components/tables/DataTable.jsx)
- [src/pages/HistoryPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/HistoryPage.jsx)

Masalah:

- `HistoryPage` mendefinisikan kolom checkbox dengan state row selection TanStack Table, tetapi page-level `selectedIds` juga punya logika sendiri yang tidak benar-benar terhubung.

Dampak:

- Fitur delete batch berpotensi tidak sinkron dengan row selection di UI.

Rekomendasi:

- Standarkan row selection memakai state TanStack Table atau page state, jangan dua-duanya.

## Low Priority Findings

### P3. README utama belum merepresentasikan project

Lokasi:

- [README.md](/Users/macbookair/Documents/IMMS/README.md)

Masalah:

- Isinya masih template Vite.

Rekomendasi:

- Ganti dengan dokumentasi project yang nyata.

### P3. Ada campuran bahasa dan istilah domain yang belum distandarkan

Lokasi:

- Banyak file frontend dan backend

Masalah:

- Istilah memakai campuran Indonesia, Inggris, dan label teknis yang berubah-ubah.

Dampak:

- Onboarding lebih lambat.

Rekomendasi:

- Buat glossary domain dan naming guideline.

## Suggested Remediation Order

1. Benahi schema drift: `latitude/longitude`, `metadata`, `site_name_manual`, enum status
2. Rapikan auth/session flow
3. Uji fitur geocoding dan mapping end-to-end
4. Rapikan row selection/history delete
5. Refactor route incident ke service layer
6. Perbarui README dan dokumentasi operasional

## Testing Gaps Observed

- Tidak terlihat test suite otomatis untuk backend route
- Tidak terlihat test component atau integration test frontend
- Tidak terlihat contract test untuk schema vs route vs UI field

## Summary

Project ini sudah cukup kuat secara fitur, tetapi risiko utamanya bukan kekurangan fitur melainkan ketidaksinkronan antar lapisan. Prioritas tertinggi adalah menyamakan model data resmi dengan apa yang benar-benar dipakai oleh route dan UI.
