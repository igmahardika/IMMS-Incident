# Nexaris Feature Map

Dokumen ini memetakan fitur aktif Nexaris ke area source utama berdasarkan kondisi codebase saat ini.

## 1. Frontend App Shell

- [src/main.jsx](/Users/macbookair/Documents/IMMS/src/main.jsx)
- [src/App.jsx](/Users/macbookair/Documents/IMMS/src/App.jsx)
- [src/components/layout/AppLayout.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/AppLayout.jsx)
- [src/components/layout/Sidebar.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/Sidebar.jsx)
- [src/components/layout/Topbar.jsx](/Users/macbookair/Documents/IMMS/src/components/layout/Topbar.jsx)

Tanggung jawab:

- route registration
- shell layout
- theme state
- role-based navigation

## 2. Authentication

- Frontend:
  - [src/context/AuthContext.jsx](/Users/macbookair/Documents/IMMS/src/context/AuthContext.jsx)
  - [src/pages/LoginPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/LoginPage.jsx)
  - [src/utils/api.js](/Users/macbookair/Documents/IMMS/src/utils/api.js)
- Backend:
  - [server/routes/auth.js](/Users/macbookair/Documents/IMMS/server/routes/auth.js)
  - [server/services/auth/auth.js](/Users/macbookair/Documents/IMMS/server/services/auth/auth.js)
  - [server/services/auth/tokens.js](/Users/macbookair/Documents/IMMS/server/services/auth/tokens.js)
  - [server/middleware/auth.js](/Users/macbookair/Documents/IMMS/server/middleware/auth.js)

Tanggung jawab:

- login/logout
- refresh token flow
- password change
- role authorization

## 3. Incident Lifecycle

- Frontend:
  - [src/pages/CreateIncidentPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CreateIncidentPage.jsx)
  - [src/pages/CurrentTroublePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/CurrentTroublePage.jsx)
  - [src/pages/IncidentDetailPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/IncidentDetailPage.jsx)
  - [src/pages/current-trouble](/Users/macbookair/Documents/IMMS/src/pages/current-trouble)
  - [src/services/incidentService.js](/Users/macbookair/Documents/IMMS/src/services/incidentService.js)
- Backend:
  - [server/routes/incidents.js](/Users/macbookair/Documents/IMMS/server/routes/incidents.js)
  - [server/services/incidents](/Users/macbookair/Documents/IMMS/server/services/incidents)

Tanggung jawab:

- create/edit incident
- start, pause, resume, close
- recurring info
- notification persistence
- escalation dispatch

## 4. Archive and Manual History Import

- [src/pages/HistoryPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/HistoryPage.jsx)
- [src/pages/history](/Users/macbookair/Documents/IMMS/src/pages/history)
- [src/utils/exportStats.js](/Users/macbookair/Documents/IMMS/src/utils/exportStats.js)
- [server/services/incidents/importResolvedHistory.js](/Users/macbookair/Documents/IMMS/server/services/incidents/importResolvedHistory.js)
- [server/scripts/import_manual_resolved_history.py](/Users/macbookair/Documents/IMMS/server/scripts/import_manual_resolved_history.py)

Tanggung jawab:

- resolved incident listing
- archive delete batch
- CSV export
- workbook import `.xlsx`
- cleanup legacy import artifacts

## 5. Dashboard and Analytics

- Frontend:
  - [src/pages/DashboardPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DashboardPage.jsx)
  - [src/pages/DurationReportPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/DurationReportPage.jsx)
  - [src/pages/RootCausePage.jsx](/Users/macbookair/Documents/IMMS/src/pages/RootCausePage.jsx)
  - [src/pages/MonthlyViewPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/MonthlyViewPage.jsx)
  - [src/components/ui/chart.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/chart.jsx)
- Backend:
  - [server/routes/analytics.js](/Users/macbookair/Documents/IMMS/server/routes/analytics.js)
  - [server/services/analytics](/Users/macbookair/Documents/IMMS/server/services/analytics)

Tanggung jawab:

- realtime overview
- duration trend
- resolution trend
- SLA report
- root cause breakdown
- technician throughput
- map analytics

## 6. Notifications and Realtime

- [src/hooks/useSocket.js](/Users/macbookair/Documents/IMMS/src/hooks/useSocket.js)
- [src/components/ui/NotificationBell.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/NotificationBell.jsx)
- [server/socket.js](/Users/macbookair/Documents/IMMS/server/socket.js)
- [server/services/incidents/notifications.js](/Users/macbookair/Documents/IMMS/server/services/incidents/notifications.js)

Tanggung jawab:

- incident update broadcast
- targeted query invalidation
- notification read state
- socket-aware notification refresh

## 7. Master Data: Customers

- [src/pages/master/CustomersPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/CustomersPage.jsx)
- [src/components/ui/CustomerMap.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/CustomerMap.jsx)
- [src/components/ui/GeoSummary.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/GeoSummary.jsx)
- [server/services/master/customers.js](/Users/macbookair/Documents/IMMS/server/services/master/customers.js)
- [server/services/master/geocode.js](/Users/macbookair/Documents/IMMS/server/services/master/geocode.js)

Tanggung jawab:

- CRUD customer
- CSV import customer
- customer map
- customer geocode sync
- geocode readiness reporting

## 8. Master Data: Classifications

- [src/pages/master/ClassificationsPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/ClassificationsPage.jsx)
- [server/services/master/classifications.js](/Users/macbookair/Documents/IMMS/server/services/master/classifications.js)

Tanggung jawab:

- classification registry
- root cause classification options

## 9. Master Data: Distribution Topology

- [src/pages/master/DistribusiPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/DistribusiPage.jsx)
- [src/components/ui/DistributionMap.jsx](/Users/macbookair/Documents/IMMS/src/components/ui/DistributionMap.jsx)
- [server/services/master/distribusi.js](/Users/macbookair/Documents/IMMS/server/services/master/distribusi.js)
- [server/services/master/geocode.js](/Users/macbookair/Documents/IMMS/server/services/master/geocode.js)

Tanggung jawab:

- CRUD topology nodes
- topology import
- topology map mode
- topology geocode sync
- trouble concentration view
- geocode readiness reporting

## 10. Personnel and Accounts

- [src/pages/master/UsersPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/master/UsersPage.jsx)
- [server/services/master/users.js](/Users/macbookair/Documents/IMMS/server/services/master/users.js)

Tanggung jawab:

- personnel directory
- login account management
- role activation/deactivation
- compatibility source for technician lookup

## 11. Escalation Settings

- [src/pages/EscalationSettingsPage.jsx](/Users/macbookair/Documents/IMMS/src/pages/EscalationSettingsPage.jsx)
- [src/hooks/useSettings.js](/Users/macbookair/Documents/IMMS/src/hooks/useSettings.js)
- [server/routes/settings.js](/Users/macbookair/Documents/IMMS/server/routes/settings.js)
- [server/services/settings/escalation.js](/Users/macbookair/Documents/IMMS/server/services/settings/escalation.js)

Tanggung jawab:

- webhook configuration
- escalation templates
- test dispatch

## 12. Shared UI Layer

- [src/components/ui](/Users/macbookair/Documents/IMMS/src/components/ui)
- [src/components/tables/DataTable.jsx](/Users/macbookair/Documents/IMMS/src/components/tables/DataTable.jsx)
- [src/lib/utils.js](/Users/macbookair/Documents/IMMS/src/lib/utils.js)

Tanggung jawab:

- shared form controls
- cards, dialog, popover, badge, scroll area
- table abstraction
- chart wrapper
- map overlays

## 13. Database and Verification

- [server/db.js](/Users/macbookair/Documents/IMMS/server/db.js)
- [server/database/runtimeCompatibility.js](/Users/macbookair/Documents/IMMS/server/database/runtimeCompatibility.js)
- [server/config/schema.js](/Users/macbookair/Documents/IMMS/server/config/schema.js)
- [server/scripts/verify_backend_services.js](/Users/macbookair/Documents/IMMS/server/scripts/verify_backend_services.js)
- [server/scripts/verify_db_governance.js](/Users/macbookair/Documents/IMMS/server/scripts/verify_db_governance.js)

Tanggung jawab:

- sqlite bootstrap
- runtime compatibility inventory
- schema source of truth
- service verification
- db governance verification

## Recommended Reading Order

1. [README.md](/Users/macbookair/Documents/IMMS/README.md)
2. [docs/ARCHITECTURE.md](/Users/macbookair/Documents/IMMS/docs/ARCHITECTURE.md)
3. [docs/CURRENT_STATE_AUDIT.md](/Users/macbookair/Documents/IMMS/docs/CURRENT_STATE_AUDIT.md)
4. [src/App.jsx](/Users/macbookair/Documents/IMMS/src/App.jsx)
5. [server/index.js](/Users/macbookair/Documents/IMMS/server/index.js)
6. [server/routes](/Users/macbookair/Documents/IMMS/server/routes)
7. [server/services](/Users/macbookair/Documents/IMMS/server/services)
