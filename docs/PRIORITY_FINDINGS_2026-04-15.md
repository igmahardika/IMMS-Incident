# IMMS Priority Findings

## Scope

Daftar ini menurunkan temuan paling penting dari audit kondisi project per 15 April 2026.

Skala prioritas:

- `P1`: perlu ditangani cepat karena berpengaruh langsung ke maintainability, reliability, atau operasional
- `P2`: penting, tetapi tidak darurat
- `P3`: peningkatan kualitas yang baik dilakukan setelah area inti aman

## P1 Findings

### P1. Business logic incident terlalu terkonsentrasi di satu route besar

Lokasi:

- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)

Masalah:

- file ini memuat create, update, pause, resume, close, recurring, notifications, batch delete, import bridge, escalation helper, cleanup legacy, dan side effect realtime
- perubahan kecil di lifecycle incident berpotensi memengaruhi area lain

Dampak:

- regression risk tinggi
- debugging menjadi lambat
- onboarding engineer baru lebih sulit

Rekomendasi:

- pecah ke service modules:
  - `incident.lifecycle`
  - `incident.history`
  - `incident.notifications`
  - `incident.import`
  - `incident.cleanup`

### P1. Database source of truth masih hybrid

Lokasi:

- [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js)
- [server/db.js](/Users/macbookair/Documents/IMMS/server/db.js)

Masalah:

- schema formal ada
- tetapi runtime masih melakukan compatibility patch manual dengan `ensureSchemaCompatibility()`

Dampak:

- environment baru bisa berbeda perilaku dari expectation migration formal
- sulit memastikan apakah perubahan schema sudah benar-benar tervalidasi lewat migration

Rekomendasi:

- pindahkan patch schema runtime ke migration formal
- pertahankan runtime compatibility hanya sebagai fallback transisional yang terbatas

### P1. Realtime invalidation masih terlalu kasar

Lokasi:

- [src/hooks/useSocket.js](/Users/macbookair/Documents/IMMS/src/hooks/useSocket.js)
- [server/socket.js](/Users/macbookair/Documents/IMMS/server/socket.js)

Masalah:

- setiap `incident-updated` hanya menginvalidate query global `['incidents']`

Dampak:

- refetch lebih besar dari yang diperlukan
- skalabilitas menurun saat jumlah incident aktif bertambah

Rekomendasi:

- kirim payload event yang lebih kaya
- update cache query spesifik incident
- pertimbangkan rooms per role atau per incident

### P1. Notification system belum benar-benar realtime

Lokasi:

- [src/components/ui/NotificationBell.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/NotificationBell.jsx)

Masalah:

- notifikasi masih polling setiap 10 detik

Dampak:

- update terasa tertunda
- ada beban request tambahan yang konstan

Rekomendasi:

- pindahkan unread count dan item notification ke socket event
- polling jadi fallback, bukan mekanisme utama

### P1. Coverage geocode topology masih rendah

Lokasi:

- [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)
- [src/components/ui/DistributionMap.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/DistributionMap.jsx)

Masalah:

- distribution topology aktif: `155 mapped / 605 missing`
- mayoritas node belum punya coordinate anchor

Dampak:

- mode map topology masih belum bisa jadi representasi spasial yang lengkap

Rekomendasi:

- tambah sumber anchor resmi selain incident/customer history
- siapkan mekanisme import koordinat topology

## P2 Findings

### P2. README utama tidak mewakili project

Lokasi:

- [README.md](/Users/macbookair/Documents/IMMS/README.md)

Masalah:

- isi masih template React + Vite

Dampak:

- onboarding dan handoff buruk
- menyesatkan engineer baru

Rekomendasi:

- ganti dengan README IMMS aktual: setup, env, roles, architecture ringkas, workflow data

### P2. Dokumentasi audit lama sudah sebagian usang

Lokasi:

- [docs/TECH_AUDIT.md](/Users/macbookair/Documents/IMMS/docs/TECH_AUDIT.md)
- [docs/ARCHITECTURE.md](/Users/macbookair/Documents/IMMS/docs/ARCHITECTURE.md)

Masalah:

- beberapa temuan lama sudah diperbaiki, tetapi dokumen belum diperbarui

Dampak:

- audit history bisa membingungkan

Rekomendasi:

- sinkronkan docs lama atau tandai sebagai historical audit

### P2. Layer UI shared masih custom-heavy

Lokasi:

- [src/components/ui/forms/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/forms/index.jsx)
- [src/components/ui/layout/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/layout/index.jsx)
- [src/components/ui/feedback/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/feedback/index.jsx)
- [src/components/ui/chart.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/chart.jsx)

Masalah:

- sudah konsisten, tetapi belum 100% setara dengan komponen official shadcn generated

Dampak:

- design system lebih sulit dipertahankan konsistensinya

Rekomendasi:

- finalisasi primitive shared agar pola variant, spacing, radius, dan typography semakin seragam

### P2. Route analytics masih mengandalkan SQL langsung dan payload custom

Lokasi:

- [server/routes/analytics.js](/Users/macbookair/Documents/IMMS/server/routes/analytics.js)

Masalah:

- query analytics cukup banyak dan manual
- belum ada lapisan service/mapper khusus analytics

Dampak:

- perubahan dashboard/report lebih riskan

Rekomendasi:

- pecah ke analytics service layer
- centralize duration formatting / metric derivation

### P2. Login page jauh lebih polished daripada halaman utilitas shared

Lokasi:

- [src/pages/LoginPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/LoginPage.jsx)
- shared components lain

Masalah:

- kualitas visual login sudah tinggi, tetapi beberapa komponen shared masih lebih “utilitarian”

Dampak:

- polish visual keseluruhan belum sepenuhnya seragam

Rekomendasi:

- lakukan pass terakhir ke chart, notification, timeline, dan map overlays

## P3 Findings

### P3. Logging masih campuran `logger` dan `console`

Lokasi:

- [server/socket.js](/Users/macbookair/Documents/IMMS/server/socket.js)
- beberapa route lain

Masalah:

- ada campuran `console.log`, `console.error`, dan `logger`

Dampak:

- observability kurang konsisten

Rekomendasi:

- standarkan semua server logging ke Winston logger

### P3. Notification sound dan UX kecil masih bisa dipoles

Lokasi:

- [src/components/ui/NotificationBell.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/NotificationBell.jsx)

Masalah:

- implementasi sudah usable, tetapi masih basic

Rekomendasi:

- tambah grouping, filter, dan explicit unread sections bila diperlukan

### P3. Generated cache masih nongol di worktree

Lokasi:

- `server/scripts/__pycache__/`

Masalah:

- cache generated masih muncul di `git status`

Rekomendasi:

- pastikan `.gitignore` mencakup `__pycache__/` dan file generated lain

## Suggested Order

Urutan kerja yang paling efektif:

1. pecah `incidents.js`
2. rapikan migration/schema governance
3. tingkatkan realtime + notifications
4. tambah geocode/topology coordinate strategy
5. finalisasi design system shared
6. sinkronkan seluruh dokumentasi
