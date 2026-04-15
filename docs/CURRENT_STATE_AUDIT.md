# IMMS Current State Audit

## Scope

Dokumen ini merangkum kondisi project IMMS **saat ini** berdasarkan source code, struktur runtime, data aktual di database lokal, dan health check build/lint pada 15 April 2026.

Dokumen ini dimaksudkan sebagai snapshot engineering terkini, bukan sejarah perubahan.

## Executive Summary

IMMS saat ini adalah aplikasi operasi NOC yang sudah mencakup:

- authentication berbasis access token + refresh token
- lifecycle incident lengkap: create, start, pause, resume, update, close
- resolved incident history dan import history manual dari workbook
- analytics dashboard, duration report, root cause, monthly analysis
- master data customer, classifications, topology distribusi, personnel/accounts
- customer map dan distribution topology map dengan geocoding
- escalation config berbasis webhook/Telegram
- realtime invalidation via Socket.IO

Secara umum, project ini **sudah usable dan cukup matang secara fitur**, tetapi masih memiliki beberapa area teknis yang perlu dirapikan agar lebih maintainable dan predictable pada skala berikutnya:

- backend business logic masih terkonsentrasi di beberapa route file besar
- database layer masih hybrid antara schema formal dan compatibility patch runtime
- beberapa komponen shared frontend masih custom-heavy meski sudah jauh lebih konsisten
- notifikasi dan realtime masih belum granular

## Health Check

Hasil pengecekan saat audit ini:

- `npm run lint`: passed
- `npm run build`: passed
- git worktree: bersih kecuali `server/scripts/__pycache__/` yang merupakan generated cache

Catatan:

- [README.md](/Users/macbookair/Documents/IMMS/README.md) masih template bawaan Vite dan belum merepresentasikan project IMMS.

## Runtime Stack

### Frontend

- React 19
- Vite 8
- React Router 7
- TanStack React Query
- Recharts
- Leaflet + React Leaflet
- Framer Motion
- Tailwind CSS 4
- shadcn-oriented component layer

### Backend

- Express 5
- better-sqlite3
- Drizzle ORM schema
- Zod validation
- Socket.IO
- Winston logging

### Database

- SQLite lokal di `imms.db`

## Repository Layout

### Frontend

- [src/App.jsx](/Users/macbookair/Documents/IMMS/src/App.jsx): provider tree, routes, protected routes
- [src/components/layout/AppLayout.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/AppLayout.jsx): shell utama aplikasi
- [src/pages](/Users/macbookair/Documents/IMMS/src/pages): halaman per fitur
- [src/components/ui](/Users/macbookair/Documents/IMMS/src/components/ui): layer UI shared
- [src/hooks](/Users/macbookair/Documents/IMMS/src/hooks): React Query hooks dan socket helper
- [src/utils/api.js](/Users/macbookair/Documents/IMMS/src/utils/api.js): API client utama

### Backend

- [server/index.js](/Users/macbookair/Documents/IMMS/server/index.js): bootstrap HTTP server
- [server/db.js](/Users/macbookair/Documents/IMMS/server/db.js): init DB, compatibility patch, seed
- [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js): schema formal
- [server/routes](/Users/macbookair/Documents/IMMS/server/routes): modul route
- [server/utils](/Users/macbookair/Documents/IMMS/server/utils): validators, logger, geocoder
- [server/scripts](/Users/macbookair/Documents/IMMS/server/scripts): utility dan importer history manual

## Data Snapshot

Snapshot database lokal saat audit:

- `users`: 48
- `master_customer`: 1789
- `master_classifications`: 41
- `master_distribusi`: 760
- `incidents`: 642
- `pause_logs`: 91
- `audit_logs`: 2303
- `notifications`: 1

Status incident saat ini:

- total active incidents: 0
- total resolved incidents: 642

Distribusi NCAL total:

- `BLACK`: 4
- `RED`: 16
- `ORANGE`: 43
- `YELLOW`: 484
- `BLUE`: 95

## Feature Status

### Authentication and Session

Status: **healthy**

Aktif di:

- [server/routes/auth.js](/Users/macbookair/Documents/IMMS/server/routes/auth.js)
- [server/middleware/auth.js](/Users/macbookair/Documents/IMMS/server/middleware/auth.js)
- [src/context/AuthContext.jsx](/Users/macbookair/Documents/IMMS/src/context/AuthContext.jsx)
- [src/utils/api.js](/Users/macbookair/Documents/IMMS/src/utils/api.js)

Kondisi saat ini:

- login berjalan dengan access token
- refresh token menggunakan cookie httpOnly
- frontend sudah mencoba refresh otomatis pada `401`
- logout membersihkan sesi backend dan local storage

Catatan:

- `AuthContext` saat ini cukup tipis dan belum mengelola state `loading` async yang lebih dalam

### Incident Workflow

Status: **feature-complete**

Aktif di:

- [src/pages/CreateIncidentPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CreateIncidentPage.jsx)
- [src/pages/CurrentTroublePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CurrentTroublePage.jsx)
- [src/pages/IncidentDetailPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/IncidentDetailPage.jsx)
- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)

Kemampuan saat ini:

- create incident
- edit incident
- start handling
- pause dan resume
- structured update
- close incident
- recurring detection
- timeline audit + pause

Catatan:

- route incident adalah pusat business logic terbesar saat ini
- secara fungsi kuat, secara maintainability masih berat

### History and Manual Import

Status: **healthy with specialized legacy support**

Aktif di:

- [src/pages/HistoryPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/HistoryPage.jsx)
- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)
- [server/scripts/import_manual_resolved_history.py](/Users/macbookair/Documents/IMMS/server/scripts/import_manual_resolved_history.py)
- [MANUAL DATA](/Users/macbookair/Documents/IMMS/MANUAL%20DATA)

Kondisi saat ini:

- upload workbook `.xlsx` supported
- duplicate case handling sudah ada
- delete batch sudah membersihkan artefak import legacy yang orphan
- normalized parsing untuk durasi dan pause segment sudah ada

Catatan:

- modul ini sudah jauh lebih aman dibanding sebelumnya
- complexity importer cukup tinggi dan butuh regression tests jika terus dikembangkan

### Analytics

Status: **usable and visually improved**

Aktif di:

- [src/pages/DashboardPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DashboardPage.jsx)
- [src/pages/DurationReportPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DurationReportPage.jsx)
- [src/pages/RootCausePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/RootCausePage.jsx)
- [src/pages/MonthlyViewPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/MonthlyViewPage.jsx)
- [server/routes/analytics.js](/Users/macbookair/Documents/IMMS/server/routes/analytics.js)

Kondisi saat ini:

- dashboard sudah lebih premium dan operationally oriented
- duration and resolution trend memakai chart berbasis durasi
- root cause dan monthly analysis sudah usable

Catatan:

- karena semua incident saat ini `done`, bagian realtime dashboard tidak sedang menunjukkan kondisi live yang sesungguhnya

### Master Data

Status: **mostly healthy**

Area:

- customers
- classifications
- distribusi/topology
- personnel & accounts

Kondisi saat ini:

- `Technical Support` telah dilebur ke `users`
- compatibility endpoint legacy masih tersedia
- `Master Actions` sudah tidak dipakai di UI, tetapi masih hidup di backend

Catatan:

- ada jejak legacy yang sengaja dipertahankan untuk kompatibilitas, bukan untuk fitur utama

### Geocode and Maps

Status: **improved, still data-dependent**

Aktif di:

- [src/components/ui/CustomerMap.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/CustomerMap.jsx)
- [src/components/ui/DistributionMap.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/DistributionMap.jsx)
- [src/pages/master/CustomersPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/CustomersPage.jsx)
- [src/pages/master/DistribusiPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/DistribusiPage.jsx)
- [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)
- [server/utils/geocoder.js](/Users/macbookair/Documents/IMMS/server/utils/geocoder.js)

Current map coverage:

- customers: `1382 mapped / 404 missing`
- active distribution nodes: `155 mapped / 605 missing`
- customer records still eligible for auto-geocode: `198`

Kondisi saat ini:

- customer sync sekarang hanya memproses record yang memang layak digeocode
- distribution sync sekarang lebih mengandalkan incident/customer anchor
- search/locate UI sekarang lebih jujur saat record ditemukan tetapi belum punya koordinat

Catatan:

- distribution topology masih punya gap coverage besar
- itu lebih merupakan masalah kualitas/kelengkapan anchor data daripada bug UI murni

### Realtime and Notifications

Status: **basic but working**

Aktif di:

- [server/socket.js](/Users/macbookair/Documents/IMMS/server/socket.js)
- [src/hooks/useSocket.js](/Users/macbookair/Documents/IMMS/src/hooks/useSocket.js)
- [src/components/ui/NotificationBell.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/NotificationBell.jsx)

Kondisi saat ini:

- socket dipakai untuk invalidation `incident-updated`
- notifikasi UI masih polling tiap 10 detik

Catatan:

- realtime incident bekerja, tetapi notifikasi belum benar-benar socket-first

## UI/UX State

Kondisi UI saat ini:

- shell utama sudah stabil dan konsisten
- mayoritas halaman utama sudah direfactor
- layout sizing enterprise sudah diterapkan di banyak area
- design language sudah jauh lebih tenang dan konsisten

Masih ada batasan:

- komponen shared masih campuran antara shadcn-style dan custom implementation
- chart, notification panel, dan beberapa util UI masih punya gaya custom yang cukup kuat

## Technical Strengths

- fitur domain luas dan menyatu
- auth flow lebih sehat daripada fase awal
- import history manual sudah serius ditangani
- geocode pipeline sudah jauh lebih rasional
- UI utama sudah cukup enterprise
- build output cukup terpecah dan lebih sehat dari sebelumnya

## Technical Weaknesses

- backend domain logic masih terlalu terkonsentrasi di route files besar
- DB evolution masih bergantung pada compatibility patch runtime
- dokumentasi root project tertinggal
- notifikasi masih polling
- test automation belum terlihat sebagai safety net utama

## Overall Assessment

Secara keseluruhan, IMMS saat ini berada di posisi:

- **produk**: kuat
- **UI/UX**: baik
- **frontend structure**: sehat
- **backend maintainability**: menengah
- **database governance**: menengah ke rawan jika skema terus berubah tanpa migrasi disiplin

Project ini sudah layak disebut aplikasi operasional yang serius, tetapi belum sepenuhnya “finished” dari sisi maintainability jangka panjang.
