# IMMS Architecture Overview

## Purpose

IMMS adalah aplikasi operasional untuk pencatatan, monitoring, penanganan, dan analitik insiden jaringan. Aplikasi ini dipakai untuk alur kerja NOC dan field handling, mulai dari pembuatan ticket sampai close incident dan pelaporan.

## High-Level Stack

- Frontend: React 19, Vite, React Router, TanStack React Query, TanStack Table, Framer Motion, Recharts, Leaflet
- Backend: Express 5, Socket.IO, better-sqlite3, Drizzle ORM schema, Zod
- Database: SQLite lokal (`imms.db`)
- Logging: Winston + daily rotate files
- Integrasi eksternal: Telegram/webhook escalation, geocoding provider

## Repository Layout

```text
src/
  components/     UI, layout, tables, map, chart, feedback
  context/        Auth dan toast
  hooks/          React Query hooks dan socket subscription
  pages/          Halaman aplikasi per fitur
  services/       Helper domain-specific
  utils/          API client, constants, formatter, export
server/
  config/         Drizzle schema
  middleware/     Auth middleware
  routes/         Auth, incidents, analytics, master, settings
  scripts/        Utility sync dan geocoding
  utils/          Logger, validators, geocoder
  migrations/     SQL migration generated
```

## Runtime Architecture

### Frontend

Entry point frontend ada di [src/main.jsx](/Users/macbookair/Documents/IMMS/src/main.jsx), lalu aplikasi utama di [src/App.jsx](/Users/macbookair/Documents/IMMS/src/App.jsx).

Lapisan utama frontend:

1. `AuthProvider`
   Menyimpan user aktif dari `localStorage` dan expose `login/logout`.
2. `ToastProvider`
   Menyediakan notifikasi UI global.
3. `QueryClientProvider`
   Menangani caching dan refetch data API.
4. `BrowserRouter`
   Mengatur routing dan proteksi role-based via `ProtectedRoute`.
5. `AppLayout`
   Membungkus halaman terproteksi dengan sidebar, topbar, dan socket listener.

### Backend

Entry point backend ada di [server/index.js](/Users/macbookair/Documents/IMMS/server/index.js).

Lapisan utama backend:

1. Bootstrap environment via `dotenv`
2. Init database dan seed awal via [server/db.js](/Users/macbookair/Documents/IMMS/server/db.js)
3. Init HTTP server + Socket.IO via [server/socket.js](/Users/macbookair/Documents/IMMS/server/socket.js)
4. Register middleware umum: CORS, cookie parser, JSON parser
5. Mount route modules:
   - `/api/auth`
   - `/api/incidents`
   - `/api/analytics`
   - `/api/master`
   - `/api/settings`

## Data Model

Schema utama didefinisikan di [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js).

### Core tables

- `users`
  Menyimpan akun, role, dan status aktif user.
- `incidents`
  Tabel inti lifecycle incident.
- `pause_logs`
  Menyimpan jeda penanganan incident.
- `audit_logs`
  Menyimpan jejak perubahan incident.
- `notifications`
  Menyimpan notifikasi internal per user atau role.

### Master tables

- `master_customer`
- `master_classifications`
- `master_actions`
- `master_technical_support`
- `master_distribusi`

### Settings tables

- `escalation_config`

## Main Business Flows

### 1. Authentication

- User login dari [src/pages/LoginPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/LoginPage.jsx)
- Frontend memanggil `POST /api/auth/login`
- Backend memvalidasi password dengan bcrypt dan membuat JWT access token
- Access token disimpan di `localStorage`
- Refresh token dikirim via cookie `httpOnly`, walau frontend saat ini belum memanfaatkannya

### 2. Incident Creation

- Halaman create/edit ada di [src/pages/CreateIncidentPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CreateIncidentPage.jsx)
- Form incident memuat customer/distribusi untuk memilih target node
- Submit memanggil `POST /api/incidents`
- Backend menyimpan incident, membuat audit log `CREATE`, kirim notifikasi assignment jika ada technician, lalu trigger escalation non-blocking
- Socket.IO emit `incident-updated`

### 3. Active Incident Handling

- Halaman monitoring aktif ada di [src/pages/CurrentTroublePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CurrentTroublePage.jsx)
- Data incident aktif diambil dari `GET /api/incidents`
- Operasi utama:
  - `POST /api/incidents/:id/start`
  - `POST /api/incidents/:id/pause`
  - `POST /api/incidents/:id/resume`
  - `PUT /api/incidents/:id`
  - `POST /api/incidents/:id/close`
- Setiap operasi menghasilkan audit log dan realtime invalidation ke frontend

### 4. Incident History and Reporting

- History page: [src/pages/HistoryPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/HistoryPage.jsx)
- Detail page: [src/pages/IncidentDetailPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/IncidentDetailPage.jsx)
- Analytics pages:
  - [src/pages/DashboardPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DashboardPage.jsx)
  - [src/pages/DurationReportPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DurationReportPage.jsx)
  - [src/pages/RootCausePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/RootCausePage.jsx)
  - [src/pages/MonthlyViewPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/MonthlyViewPage.jsx)

### 5. Escalation

- Settings UI ada di [src/pages/EscalationSettingsPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/EscalationSettingsPage.jsx)
- Backend settings route ada di [server/routes/settings.js](/Users/macbookair/Documents/IMMS/server/routes/settings.js)
- Saat incident open/close, backend memilih template sesuai segment NCAL dan mengirim webhook Telegram/vendor

## Frontend Structure

### State and data access

- Auth context: [src/context/AuthContext.jsx](/Users/macbookair/Documents/IMMS/src/context/AuthContext.jsx)
- Toast context: [src/context/ToastContext.jsx](/Users/macbookair/Documents/IMMS/src/context/ToastContext.jsx)
- API client: [src/utils/api.js](/Users/macbookair/Documents/IMMS/src/utils/api.js)
- React Query hooks:
  - [src/hooks/useIncidents.js](/Users/macbookair/Documents/IMMS/src/hooks/useIncidents.js)
  - [src/hooks/useMasterData.js](/Users/macbookair/Documents/IMMS/src/hooks/useMasterData.js)
  - [src/hooks/useSettings.js](/Users/macbookair/Documents/IMMS/src/hooks/useSettings.js)
  - [src/hooks/useSocket.js](/Users/macbookair/Documents/IMMS/src/hooks/useSocket.js)

### Layout and navigation

- Layout shell: [src/components/layout/AppLayout.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/AppLayout.jsx)
- Sidebar: [src/components/layout/Sidebar.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/Sidebar.jsx)
- Topbar: [src/components/layout/Topbar.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/Topbar.jsx)

### Shared UI

- Barrel export: [src/components/ui/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/index.jsx)
- Generic table: [src/components/tables/DataTable.jsx](/Users/macbookair/Documents/IMMS/src/components/tables/DataTable.jsx)
- Timeline merger/rendering depends on [src/utils/incidentUtils.js](/Users/macbookair/Documents/IMMS/src/utils/incidentUtils.js) and [src/components/ui/UnifiedTimeline.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/UnifiedTimeline.jsx)

## Backend Structure

### Routes

- Auth: [server/routes/auth.js](/Users/macbookair/Documents/IMMS/server/routes/auth.js)
- Incidents: [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)
- Analytics: [server/routes/analytics.js](/Users/macbookair/Documents/IMMS/server/routes/analytics.js)
- Master data: [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)
- Settings: [server/routes/settings.js](/Users/macbookair/Documents/IMMS/server/routes/settings.js)

### Infrastructure utilities

- Auth middleware: [server/middleware/auth.js](/Users/macbookair/Documents/IMMS/server/middleware/auth.js)
- Validation: [server/utils/validators.js](/Users/macbookair/Documents/IMMS/server/utils/validators.js)
- Geocoder: [server/utils/geocoder.js](/Users/macbookair/Documents/IMMS/server/utils/geocoder.js)
- Logger: [server/utils/logger.js](/Users/macbookair/Documents/IMMS/server/utils/logger.js)

## Realtime Flow

- Socket server diinisialisasi di backend
- Frontend membuka koneksi dari [src/hooks/useSocket.js](/Users/macbookair/Documents/IMMS/src/hooks/useSocket.js)
- Event utama adalah `incident-updated`
- Handler frontend meng-invalidate query React Query terkait incident

Model ini sederhana: backend tidak mengirim patch detail state, hanya sinyal invalidation agar frontend refetch.

## Configuration

### Environment

Contoh environment ada di [/.env.example](/Users/macbookair/Documents/IMMS/.env.example).

Variabel yang terlihat dipakai:

- `PORT`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `NODE_ENV`
- `GEOCODER_PROVIDER`
- `GOOGLE_MAPS_KEY`
- `MAPBOX_KEY`
- `GEOCODER_CONCURRENCY`
- `GEOCODER_INTERVAL`

### Build and run

[package.json](/Users/macbookair/Documents/IMMS/package.json) menyediakan script:

- `npm run dev` untuk frontend + backend bersamaan
- `npm run frontend`
- `npm run backend`
- `npm run build`
- `npm run lint`

## Architectural Characteristics

### Strengths

- Struktur folder cukup jelas antara frontend dan backend
- Fitur bisnis utama sudah lengkap untuk operasi incident
- React Query + Socket invalidation membuat UI cukup responsif
- Audit log dan pause log memberi traceability yang bagus
- Role-based navigation dan authorization sudah diterapkan

### Tradeoffs and current constraints

- Schema sudah memakai Drizzle, tetapi query bisnis masih dominan SQL mentah
- Session architecture belum konsisten karena refresh token belum dipakai di frontend
- Ada indikasi drift antara schema, route SQL, dan field yang dipakai UI
- Dokumentasi project sebelumnya sangat minim

## Recommended Next Architecture Work

1. Samakan schema, migration, dan seluruh field yang dipakai frontend/backend
2. Rapikan session flow agar access token refresh benar-benar dipakai
3. Pisahkan domain logic incident dari route handler yang saat ini sangat gemuk
4. Kurangi field legacy/tidak terpakai agar model data lebih jelas
5. Tambahkan dokumentasi API dan seed data yang resmi
