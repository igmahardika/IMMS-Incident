# IMMS Feature Map

## Purpose

Dokumen ini memetakan fitur ke file-file utama agar onboarding, debugging, dan pengembangan lanjutan lebih cepat.

## 1. App Shell and Bootstrapping

### Files

- [src/main.jsx](/Users/macbookair/Documents/IMMS/src/main.jsx)
- [src/App.jsx](/Users/macbookair/Documents/IMMS/src/App.jsx)
- [src/index.css](/Users/macbookair/Documents/IMMS/src/index.css)
- [vite.config.js](/Users/macbookair/Documents/IMMS/vite.config.js)

### Responsibility

- Entry point frontend
- Provider tree
- Route registration
- Theme setup
- Global styles

## 2. Authentication and Session

### Frontend files

- [src/context/AuthContext.jsx](/Users/macbookair/Documents/IMMS/src/context/AuthContext.jsx)
- [src/pages/LoginPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/LoginPage.jsx)
- [src/utils/api.js](/Users/macbookair/Documents/IMMS/src/utils/api.js)

### Backend files

- [server/routes/auth.js](/Users/macbookair/Documents/IMMS/server/routes/auth.js)
- [server/middleware/auth.js](/Users/macbookair/Documents/IMMS/server/middleware/auth.js)

### What lives here

- Login
- Logout
- Access token validation
- Role-based authorization middleware
- Password change

## 3. Layout, Navigation, and Realtime Shell

### Files

- [src/components/layout/AppLayout.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/AppLayout.jsx)
- [src/components/layout/Sidebar.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/Sidebar.jsx)
- [src/components/layout/Topbar.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/Topbar.jsx)
- [src/hooks/useSocket.js](/Users/macbookair/Documents/IMMS/src/hooks/useSocket.js)
- [server/socket.js](/Users/macbookair/Documents/IMMS/server/socket.js)

### What lives here

- Sidebar menu by role
- Header/topbar
- Theme toggle
- Notification access
- Socket connection and query invalidation

## 4. Incident Creation and Editing

### Frontend files

- [src/pages/CreateIncidentPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CreateIncidentPage.jsx)
- [src/services/incidentService.js](/Users/macbookair/Documents/IMMS/src/services/incidentService.js)
- [src/hooks/useMasterData.js](/Users/macbookair/Documents/IMMS/src/hooks/useMasterData.js)

### Backend files

- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)
- [server/utils/validators.js](/Users/macbookair/Documents/IMMS/server/utils/validators.js)

### What lives here

- Create incident
- Edit incident
- Customer/distribusi selection
- Draft localStorage
- Validation of incident payload

## 5. Active Incident Operations

### Frontend files

- [src/pages/CurrentTroublePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CurrentTroublePage.jsx)
- [src/hooks/useIncidents.js](/Users/macbookair/Documents/IMMS/src/hooks/useIncidents.js)
- [src/utils/incidentUtils.js](/Users/macbookair/Documents/IMMS/src/utils/incidentUtils.js)
- [src/components/ui/UnifiedTimeline.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/UnifiedTimeline.jsx)

### Backend files

- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)

### What lives here

- Active incident queue
- Start action
- Pause/resume
- Update root cause/action detail
- Close incident
- Live timer and SLA progress
- Timeline processing

## 6. Incident Detail and History

### Files

- [src/pages/IncidentDetailPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/IncidentDetailPage.jsx)
- [src/pages/HistoryPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/HistoryPage.jsx)
- [src/pages/MonthlyViewPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/MonthlyViewPage.jsx)
- [src/utils/exportStats.js](/Users/macbookair/Documents/IMMS/src/utils/exportStats.js)
- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)

### What lives here

- Detail incident
- History list
- Recurring incident check
- Batch delete history
- Excel export
- Historical filtering

## 7. Dashboard and Analytics

### Frontend files

- [src/pages/DashboardPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DashboardPage.jsx)
- [src/pages/DurationReportPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DurationReportPage.jsx)
- [src/pages/RootCausePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/RootCausePage.jsx)
- [src/components/ui/chart.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/chart.jsx)

### Backend files

- [server/routes/analytics.js](/Users/macbookair/Documents/IMMS/server/routes/analytics.js)

### What lives here

- Dashboard KPI
- SLA summary
- Duration trends
- Root cause breakdown
- Technician performance
- Trouble map analytics

## 8. Notifications

### Files

- [src/components/ui/NotificationBell.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/NotificationBell.jsx)
- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)
- [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js)

### What lives here

- Notification polling
- Mark read
- Assignment/update notifications
- Notification persistence

## 9. Master Data: Customers

### Files

- [src/pages/master/CustomersPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/CustomersPage.jsx)
- [src/components/ui/CustomerMap.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/CustomerMap.jsx)
- [src/components/ui/GeoSummary.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/GeoSummary.jsx)
- [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)

### What lives here

- CRUD customer
- Excel import customer
- Customer map
- Auto-geocode customer
- Geo summary

## 10. Master Data: Classifications

### Files

- [src/pages/master/ClassificationsPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/ClassificationsPage.jsx)
- [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)

### What lives here

- CRUD klasifikasi dan sub-klasifikasi

## 11. Master Data: Actions

### Files

- [src/pages/master/ActionsPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/ActionsPage.jsx)
- [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)

### What lives here

- CRUD master tindakan penanganan

## 12. Master Data: Users

### Files

- [src/pages/master/UsersPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/UsersPage.jsx)
- [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)

### What lives here

- CRUD account user
- Role assignment
- Aktivasi/deaktivasi user

## 13. Master Data: Technical Support

### Files

- [src/pages/master/TechnicalSupportPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/TechnicalSupportPage.jsx)
- [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)

### What lives here

- CRUD personel technical support
- Batch import technical support

## 14. Master Data: Distribution Topology

### Files

- [src/pages/master/DistribusiPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/DistribusiPage.jsx)
- [src/components/ui/DistributionMap.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/DistributionMap.jsx)
- [server/routes/master.js](/Users/macbookair/Documents/IMMS/server/routes/master.js)
- [server/routes/analytics.js](/Users/macbookair/Documents/IMMS/server/routes/analytics.js)

### What lives here

- CRUD distribusi
- Import distribusi
- Auto-geocode distribusi
- Distribution map
- Distribution trouble heat points

## 15. Escalation Settings

### Files

- [src/pages/EscalationSettingsPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/EscalationSettingsPage.jsx)
- [src/hooks/useSettings.js](/Users/macbookair/Documents/IMMS/src/hooks/useSettings.js)
- [server/routes/settings.js](/Users/macbookair/Documents/IMMS/server/routes/settings.js)
- [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)

### What lives here

- Config webhook internal/vendor
- Config template per NCAL
- Test escalation
- Open/close escalation dispatch

## 16. Shared UI and Utility Layer

### Files

- [src/components/ui/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/index.jsx)
- [src/components/ui/data/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/data/index.jsx)
- [src/components/ui/forms/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/forms/index.jsx)
- [src/components/ui/feedback/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/feedback/index.jsx)
- [src/components/ui/layout/index.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/layout/index.jsx)
- [src/components/tables/DataTable.jsx](/Users/macbookair/Documents/IMMS/src/components/tables/DataTable.jsx)
- [src/lib/utils.js](/Users/macbookair/Documents/IMMS/src/lib/utils.js)
- [src/utils/themeMap.js](/Users/macbookair/Documents/IMMS/src/utils/themeMap.js)
- [src/utils/constants.js](/Users/macbookair/Documents/IMMS/src/utils/constants.js)

### What lives here

- Shared atoms/components
- Table abstraction
- Theme mapping
- Constants dan utility presentation

## 17. Database and Persistence Layer

### Files

- [server/db.js](/Users/macbookair/Documents/IMMS/server/db.js)
- [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js)
- [server/migrations/0000_famous_firelord.sql](/Users/macbookair/Documents/IMMS/server/migrations/0000_famous_firelord.sql)
- [server/drizzle.config.js](/Users/macbookair/Documents/IMMS/server/drizzle.config.js)

### What lives here

- SQLite bootstrap
- Seed awal
- Drizzle schema
- Migration artifacts

## 18. Support Scripts

### Files

- [server/scripts/sync_all.js](/Users/macbookair/Documents/IMMS/server/scripts/sync_all.js)
- [server/scripts/bulk_update_coords.js](/Users/macbookair/Documents/IMMS/server/scripts/bulk_update_coords.js)
- [server/scripts/inspect_xlsx.js](/Users/macbookair/Documents/IMMS/server/scripts/inspect_xlsx.js)
- [analyze_odp_v2.js](/Users/macbookair/Documents/IMMS/analyze_odp_v2.js)
- [sync_odp_coords.js](/Users/macbookair/Documents/IMMS/sync_odp_coords.js)
- [split_master_data.mjs](/Users/macbookair/Documents/IMMS/split_master_data.mjs)

### What lives here

- Sinkronisasi koordinat
- Utility import/analisis data
- Script migrasi operasional

## Recommended Reading Order for New Contributors

1. [docs/ARCHITECTURE.md](/Users/macbookair/Documents/IMMS/docs/ARCHITECTURE.md)
2. [src/App.jsx](/Users/macbookair/Documents/IMMS/src/App.jsx)
3. [server/index.js](/Users/macbookair/Documents/IMMS/server/index.js)
4. [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js)
5. [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)
6. [src/pages/CreateIncidentPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CreateIncidentPage.jsx)
7. [src/pages/CurrentTroublePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CurrentTroublePage.jsx)
8. [src/pages/IncidentDetailPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/IncidentDetailPage.jsx)
9. [docs/TECH_AUDIT.md](/Users/macbookair/Documents/IMMS/docs/TECH_AUDIT.md)

## Fast Navigation by Use Case

- Mau ubah auth: lihat `AuthContext`, `api.js`, `auth.js`, `middleware/auth.js`
- Mau ubah lifecycle incident: lihat `CreateIncidentPage`, `CurrentTroublePage`, `IncidentDetailPage`, `incidents.js`
- Mau ubah dashboard/report: lihat `DashboardPage`, `HistoryPage`, `analytics.js`
- Mau ubah master data: lihat `pages/master/*` dan `server/routes/master.js`
- Mau ubah eskalasi: lihat `EscalationSettingsPage`, `useSettings.js`, `settings.js`, `incidents.js`
