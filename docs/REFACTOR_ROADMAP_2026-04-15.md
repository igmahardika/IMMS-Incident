# Nexaris Refactor Roadmap

## Goal

Roadmap ini memetakan langkah refactor berikutnya berdasarkan kondisi project saat ini, dengan fokus pada:

- menjaga fitur yang sudah stabil
- menurunkan risiko regresi
- meningkatkan maintainability
- merapikan fondasi frontend, backend, dan database

## Guiding Principles

- jangan ubah terlalu banyak domain logic sekaligus
- pertahankan kompatibilitas operasional user NOC
- pisahkan pekerjaan stabilisasi dari pekerjaan beautification
- setiap refactor besar harus punya target risiko yang jelas

## Workstreams

### 1. Frontend Platform

Target:

- finalisasi shared UI layer
- rapikan data flow realtime
- kurangi custom complexity di komponen shared

Modules:

- [src/components/ui/forms/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/forms/index.jsx)
- [src/components/ui/layout/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/layout/index.jsx)
- [src/components/ui/feedback/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/feedback/index.jsx)
- [src/components/ui/chart.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/chart.jsx)
- [src/components/ui/NotificationBell.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/NotificationBell.jsx)
- [src/components/ui/UnifiedTimeline.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/UnifiedTimeline.jsx)

Recommended tasks:

- unify variant API untuk button/input/select/modal/card
- rapikan chart primitives agar typography dan tooltip lebih konsisten
- migrasi notifikasi ke socket-aware panel
- audit ulang map overlay control dan timeline density

### 2. Frontend Feature Modules

Target:

- rapikan page-level composition
- jaga agar setiap halaman makin tipis dan lebih declarative

Modules:

- [src/pages/DashboardPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DashboardPage.jsx)
- [src/pages/CurrentTroublePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CurrentTroublePage.jsx)
- [src/pages/CreateIncidentPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CreateIncidentPage.jsx)
- [src/pages/HistoryPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/HistoryPage.jsx)
- [src/pages/master/CustomersPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/CustomersPage.jsx)
- [src/pages/master/DistribusiPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/DistribusiPage.jsx)

Recommended tasks:

- pecah modal besar ke komponen terisolasi
- pecah toolbar/filter/action bars menjadi reusable sections
- batasi logic page pada orchestration, bukan formatting detail

### 3. Backend Incident Domain

Target:

- membongkar hotspot terbesar project

Primary file:

- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)

Recommended module split:

- `server/services/incidents/createIncident.js`
- `server/services/incidents/updateIncident.js`
- `server/services/incidents/pauseIncident.js`
- `server/services/incidents/resumeIncident.js`
- `server/services/incidents/closeIncident.js`
- `server/services/incidents/importResolvedHistory.js`
- `server/services/incidents/deleteBatchIncidents.js`
- `server/services/incidents/sendEscalation.js`

Recommended sequence:

1. extract pure helper functions
2. extract lifecycle operations
3. extract side effects
4. leave route file as thin controller

### 4. Backend Analytics Domain

Target:

- membuat analytics lebih mudah diubah tanpa menyentuh route langsung

Primary file:

- [server/routes/analytics.js](/Users/macbookair/Documents/IMMS/server/routes/analytics.js)

Recommended tasks:

- extract dashboard query builder
- extract duration/root-cause service functions
- centralize duration and SLA formatting
- document shape dari payload analytics

### 5. Backend Master Data and Geocode

Target:

- mempertahankan stabilitas map dan geocode sambil menurunkan complexity

Primary files:

- [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)
- [server/utils/geocoder.js](/Users/macbookair/Documents/IMMS/server/utils/geocoder.js)

Recommended tasks:

- pecah customer, users, distribusi, classifications ke router/service terpisah
- isolasi geocode orchestration ke service module sendiri
- tambahkan explicit strategy untuk topology coordinates
- tambah audit/report helper untuk records yang masih unmapped

### 6. Database Governance

Target:

- memastikan schema formal menjadi source of truth yang jelas

Primary files:

- [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js)
- [server/db.js](/Users/macbookair/Documents/IMMS/server/db.js)
- [server/migrations](/Users/macbookair/Documents/IMMS/server/migrations)

Recommended tasks:

- inventaris semua compatibility patch runtime
- ubah patch yang permanen menjadi migration formal
- kurangi logika schema mutation saat bootstrap

### 7. Documentation and Onboarding

Target:

- membuat project dapat dipahami tanpa reverse-engineering codebase

Primary files:

- [README.md](/Users/macbookair/Documents/IMMS/README.md)
- [docs/ARCHITECTURE.md](/Users/macbookair/Documents/IMMS/docs/ARCHITECTURE.md)
- [docs/FEATURE_MAP.md](/Users/macbookair/Documents/IMMS/docs/FEATURE_MAP.md)
- [docs/TECH_AUDIT.md](/Users/macbookair/Documents/IMMS/docs/TECH_AUDIT.md)

Recommended tasks:

- rewrite README sesuai positioning dan workflow Nexaris
- tandai audit lama sebagai historical bila tidak lagi aktual
- sinkronkan feature map dengan menu dan route terbaru

## Suggested Phases

### Phase 1: Stabilization

Fokus:

- incident route decomposition
- notification/realtime improvements
- DB schema governance alignment

Deliverables:

- thinner incident route
- clearer side effect boundaries
- reduced regression risk

### Phase 2: UX and Shared System Finalization

Fokus:

- shared UI primitives
- chart and notification refinement
- page-level cleanup

Deliverables:

- tighter design system
- more predictable component API

### Phase 3: Data and Spatial Accuracy

Fokus:

- geocode coverage
- topology coordinate strategy
- reporting on unmapped entities

Deliverables:

- more useful maps
- fewer silent failures in spatial workflows

### Phase 4: Documentation and Operational Readiness

Fokus:

- README
- architecture docs
- ops notes

Deliverables:

- easier onboarding
- lower tribal knowledge dependency

## Immediate Next Best Step

Jika hanya memilih satu pekerjaan berikutnya, prioritas terbaik adalah:

1. refactor [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)

Karena file itu adalah titik paling sensitif dan paling banyak memegang aturan bisnis project saat ini.
