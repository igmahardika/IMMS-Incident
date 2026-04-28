# Breakpoint Audit 2026-04-17

## Executive Summary

This audit reviews the current responsive breakpoint discipline across Nexaris pages and their page-critical supporting components. The goal is to determine whether the application already follows a professional breakpoint standard consistently and to identify pages that still rely on ad hoc or late-stage (`xl`) layout changes.

Current verdict:

- The project has a strong and consistent responsive foundation.
- The project does **not** yet have fully consistent breakpoint discipline across every page.
- The main inconsistency is not missing responsiveness, but **inconsistent breakpoint intent**:
  - some pages settle into their desktop layout at `lg`
  - some only become well-structured at `xl`
  - some toolbars still stack too long before becoming production-clean
- Shared layout primitives are already strong enough to support a more formalized standard without re-architecture.

Overall breakpoint maturity:

- Foundation consistency: **Good**
- Page-to-page consistency: **Moderate to Good**
- Enterprise-standard breakpoint discipline: **Not fully standardized yet**

Recommended score: **7.5 / 10**

---

## Baseline Breakpoint System

The project uses the default Tailwind breakpoint system because [`tailwind.config.js`](/Users/macbookair/Documents/IMMS/tailwind.config.js) does not override `theme.screens`.

Active breakpoints:

- `sm`: `640px`
- `md`: `768px`
- `lg`: `1024px`
- `xl`: `1280px`
- `2xl`: `1536px`

Observed usage counts across `src/pages` and `src/components`:

- `sm`: 27
- `md`: 69
- `lg`: 32
- `xl`: 63
- `2xl`: 0

Interpretation:

- `md` is the main breakpoint for density and 2-column conversion.
- `xl` is heavily used for large workspace splits and map/detail rails.
- `lg` is underused relative to `xl`, which is one of the main causes of inconsistency.
- `2xl` is unused, which is acceptable, but it also means large-screen optimization is not formally tiered yet.

---

## Professional Standard For This Project

To make Nexaris feel more professional and internally consistent, the current codebase should treat breakpoints with the following intent:

- Base:
  - one-column stack
  - touch-friendly toolbars
  - no dependence on side rails
- `md`:
  - two-column forms
  - stat cards move into 2-up grids
  - spacing increases from mobile to working-tablet density
- `lg`:
  - desktop baseline activates
  - primary toolbars should already align horizontally
  - list/detail and form/preview pages should already feel "desktop usable"
- `xl`:
  - complex workspace enhancements only
  - side rails
  - sticky detail panels
  - map support rails
  - analytics split views
- `2xl`:
  - optional visual enhancement only
  - never required for a page to feel "finished"

Professional rule of thumb:

- A page may **enhance** at `xl`.
- A page should **not depend on `xl` to become orderly** unless it is a genuinely complex workspace such as maps or split analytics.

---

## Shared Foundation Audit

### Strong / Consistent

- [`src/components/layout/AppLayout.jsx`](/Users/macbookair/Documents/IMMS/src/components/layout/AppLayout.jsx)
  - Solid desktop/mobile shell discipline.
  - Uses `lg` appropriately for sidebar behavior and `md` for page padding.
- [`src/components/ui/layout/index.jsx`](/Users/macbookair/Documents/IMMS/src/components/ui/layout/index.jsx)
  - Shared primitives already normalize header and body spacing with `md`.
  - Good basis for enterprise page consistency.
- [`src/components/layout/Topbar.jsx`](/Users/macbookair/Documents/IMMS/src/components/layout/Topbar.jsx)
  - Uses `sm`, `md`, and `lg` with clear intent.
  - Good example of progressive disclosure instead of late breakpoint jumps.
- [`src/components/ui/forms/index.jsx`](/Users/macbookair/Documents/IMMS/src/components/ui/forms/index.jsx)
  - Control sizing tiers are formalized and professional.
- [`src/components/ui/feedback/index.jsx`](/Users/macbookair/Documents/IMMS/src/components/ui/feedback/index.jsx)
  - Modal width tiers are consistent and usable.

### Needs Standardization Attention

- [`src/components/ui/CustomerMap.jsx`](/Users/macbookair/Documents/IMMS/src/components/ui/CustomerMap.jsx)
- [`src/components/ui/DistributionMap.jsx`](/Users/macbookair/Documents/IMMS/src/components/ui/DistributionMap.jsx)
  - Both are internally consistent with each other.
  - However, both rely heavily on `xl`, which is acceptable for complex map workspaces but should be treated as an explicit standard, not an exception that silently spreads.

---

## Page Audit

### 1. Dashboard

- File: [`src/pages/DashboardPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/DashboardPage.jsx)
- Breakpoint profile: `md`, `lg`, heavy `xl`
- Verdict: **Acceptable, but over-dependent on `xl`**

What is good:

- metric blocks start adapting at `md`
- list rows adapt at `lg`
- large analytics splits at `xl` are reasonable

What is not fully professional yet:

- the page has many `xl:col-span-*` and `xl:grid-cols-*` dependencies
- this makes the layout feel strongly tuned for `1280+`
- on `1024–1279px`, the page remains functional, but not as intentionally composed as a professional command-center page should be

Recommendation:

- keep `xl` for advanced spans
- introduce more `lg`-level intermediate layout decisions for major section pairs

Status: **Needs refinement, not broken**

---

### 2. Create Incident

- File: [`src/pages/CreateIncidentPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/CreateIncidentPage.jsx)
- Breakpoint profile: strong `md`, moderate `xl`
- Verdict: **Professional**

What is good:

- forms convert at `md`
- preview rail activates at `xl`, which is appropriate
- page remains understandable before `xl`

Status: **Consistent**

---

### 3. Current Trouble

- File: [`src/pages/CurrentTroublePage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/CurrentTroublePage.jsx)
- Breakpoint profile: light `lg`
- Verdict: **Mostly professional**

What is good:

- page remains simple and readable without overusing breakpoints
- header organization shifts at `lg`

What is weak:

- breakpoint strategy is thin and not as explicit as other mature pages
- this is not a bug, but it means the page relies more on natural flex wrapping than on declared responsive intent

Status: **Acceptable**

---

### 4. Incident Detail

- File: [`src/pages/IncidentDetailPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/IncidentDetailPage.jsx)
- Breakpoint profile: `md`, `lg`, `xl`
- Verdict: **Professional**

What is good:

- cards become two-column at `md`
- supporting rail becomes sticky/split at `xl`
- desktop hierarchy is clear without depending on only one breakpoint

Status: **Consistent**

---

### 5. Duration Intelligence

- File: [`src/pages/DurationReportPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/DurationReportPage.jsx)
- Breakpoint profile: `sm`, `md`, `lg`, `xl`
- Verdict: **Professional**

What is good:

- filters and stat cards scale progressively
- analytics sections are not waiting until `xl` to become readable

Status: **Consistent**

---

### 6. Root Cause Intelligence

- File: [`src/pages/RootCausePage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/RootCausePage.jsx)
- Breakpoint profile: `sm`, `md`, `lg`, `xl`
- Verdict: **Professional**

What is good:

- action filters adapt early
- metric and chart layouts scale progressively
- `xl` is used for enhancement, not rescue

Status: **Consistent**

---

### 7. Escalation Settings

- File: [`src/pages/EscalationSettingsPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/EscalationSettingsPage.jsx)
- Breakpoint profile: `md`, `xl`
- Verdict: **Mostly professional**

What is good:

- form internals adapt at `md`
- preview/editor workspace split at `xl` is reasonable

What is weak:

- the page has no strong `lg` desktop intermediate state
- it goes from stacked to `xl` workspace rather abruptly

Status: **Acceptable, but could be more disciplined**

---

### 8. Login

- File: [`src/pages/LoginPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/LoginPage.jsx)
- Breakpoint profile: `sm`, `lg`
- Verdict: **Professional**

What is good:

- clear mobile-first behavior
- hero appears at `lg`
- compact form remains centered and stable

Status: **Consistent**

---

### 9. Monthly Analysis

- File: [`src/pages/MonthlyViewPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/MonthlyViewPage.jsx)
- Breakpoint profile: very light (`sm`)
- Verdict: **Acceptable but under-specified**

What is good:

- overflow table strategy is valid
- not every page needs many breakpoints

What is weak:

- responsive behavior is mostly delegated to scrolling rather than structured layout decisions
- this is functional, but not especially polished

Status: **Acceptable, not exemplary**

---

### 10. History / Resolved Incidents

- File: [`src/pages/HistoryPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/HistoryPage.jsx)
- Critical supporting file: [`src/pages/history/ArchiveFilters.jsx`](/Users/macbookair/Documents/IMMS/src/pages/history/ArchiveFilters.jsx)
- Verdict: **Not fully professional yet**

Main issue:

- `ArchiveFilters.jsx` uses an `xl`-only toolbar grid:
  - `xl:grid-cols-[minmax(0,1fr)_140px_180px_160px_auto]`
- before `xl`, the entire filter system becomes a long stacked block

Why this matters:

- this page is operationally important
- a professional filter toolbar should already align into a useful desktop row at `lg`
- requiring `xl` for a clean filter toolbar is too late

Status: **Needs standardization**

---

### 11. Customer Records

- File: [`src/pages/master/CustomersPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/CustomersPage.jsx)
- Critical supporting files:
  - [`src/pages/master/customers/CustomerToolbar.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/customers/CustomerToolbar.jsx)
  - [`src/components/ui/CustomerMap.jsx`](/Users/macbookair/Documents/IMMS/src/components/ui/CustomerMap.jsx)
- Verdict: **Mixed**

What is good:

- list summary cards use `md:grid-cols-2 lg:grid-cols-4`
- main mode separation (`list`, `map`, `review`) is now clean
- map workspace itself is internally coherent

What is weak:

- `CustomerToolbar.jsx` only becomes a structured multi-field row at `xl`
- on `lg`, list mode still stacks search and filters vertically even though the viewport is already desktop-sized
- `CustomerMap.jsx` is justified in using `xl` for the right rail, but the project should explicitly treat this as a map-workspace pattern

Status:

- `List`: **Needs breakpoint refinement**
- `Map`: **Professional if `xl` rail pattern is accepted as standard**
- `Sync Review`: **Acceptable**

---

### 12. Distribution Topology

- File: [`src/pages/master/DistribusiPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/DistribusiPage.jsx)
- Critical supporting files:
  - [`src/components/ui/DistributionMap.jsx`](/Users/macbookair/Documents/IMMS/src/components/ui/DistributionMap.jsx)
  - [`src/pages/master/distribusi/TopologyDetailPanel.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/distribusi/TopologyDetailPanel.jsx)
- Verdict: **Mixed**

What is good:

- map workspace is now cleaner and more intentional
- `TopologyDetailPanel` uses `md`, `lg`, and `xl` reasonably
- explorer/review/map separation is much improved

What is weak:

- the main page-level explorer split only activates at `xl`
- for a dense registry workspace, that means `lg` desktop still behaves more like a large tablet
- `DistributionMap.jsx` is coherent, but again heavily `xl`-dependent

Status:

- `Explorer`: **Needs breakpoint refinement**
- `Map`: **Professional if `xl` rail pattern is formalized**
- `Review`: **Acceptable**

---

### 13. Classifications

- File: [`src/pages/master/ClassificationsPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/ClassificationsPage.jsx)
- Breakpoint profile: `md`, `xl`
- Verdict: **Professional**

What is good:

- card grid scales simply and cleanly
- this page does not overuse breakpoints

Status: **Consistent**

---

### 14. Users / Personnel

- File: [`src/pages/master/UsersPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/UsersPage.jsx)
- Breakpoint profile: `md`
- Verdict: **Professional**

What is good:

- page uses a table-first model and only applies breakpoints where forms need them
- edit modal uses `md` appropriately

Status: **Consistent**

---

## Hotspot Components That Affect Multiple Pages

### 1. CustomerToolbar

- File: [`src/pages/master/customers/CustomerToolbar.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/customers/CustomerToolbar.jsx)
- Current issue:
  - toolbar grid only activates at `xl`
- Why it is a problem:
  - search + 2 filters should already form a stable row at `lg`
- Priority: **High**

### 2. ArchiveFilters

- File: [`src/pages/history/ArchiveFilters.jsx`](/Users/macbookair/Documents/IMMS/src/pages/history/ArchiveFilters.jsx)
- Current issue:
  - toolbar grid only activates at `xl`
- Why it is a problem:
  - archive filtering is a core operational flow and should not look unfinished on standard desktop widths
- Priority: **High**

### 3. Map Workspaces

- Files:
  - [`src/components/ui/CustomerMap.jsx`](/Users/macbookair/Documents/IMMS/src/components/ui/CustomerMap.jsx)
  - [`src/components/ui/DistributionMap.jsx`](/Users/macbookair/Documents/IMMS/src/components/ui/DistributionMap.jsx)
- Current issue:
  - `xl` is doing most of the structural work
- Why this is acceptable:
  - maps are genuinely complex workspaces
- What is still needed:
  - document them as a formal pattern:
    - base/`md`: stacked workspace
    - `lg`: toolbar mature
    - `xl`: side rail activation

Priority: **Medium**

### 4. Explorer Splits

- Files:
  - [`src/pages/master/DistribusiPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/DistribusiPage.jsx)
  - [`src/pages/master/CustomersPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/CustomersPage.jsx)
- Current issue:
  - desktop-quality split behavior often waits for `xl`
- Priority: **Medium**

---

## Pages With Strong Breakpoint Discipline

These pages are the best current references for future work:

- [`src/pages/LoginPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/LoginPage.jsx)
- [`src/pages/CreateIncidentPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/CreateIncidentPage.jsx)
- [`src/pages/IncidentDetailPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/IncidentDetailPage.jsx)
- [`src/pages/DurationReportPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/DurationReportPage.jsx)
- [`src/pages/RootCausePage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/RootCausePage.jsx)
- [`src/pages/master/UsersPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/UsersPage.jsx)
- [`src/pages/master/ClassificationsPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/ClassificationsPage.jsx)

These pages generally follow the right pattern:

- early adaptation at `md`
- desktop usability before `xl`
- `xl` used for enhancement rather than rescue

---

## Pages That Are Functional But Not Yet Fully Professional

These are the pages that need the most breakpoint standardization:

1. [`src/pages/history/ArchiveFilters.jsx`](/Users/macbookair/Documents/IMMS/src/pages/history/ArchiveFilters.jsx)
   - `xl`-only toolbar composition
2. [`src/pages/master/customers/CustomerToolbar.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/customers/CustomerToolbar.jsx)
   - `xl`-only list toolbar composition
3. [`src/pages/master/DistribusiPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/DistribusiPage.jsx)
   - explorer split arrives too late
4. [`src/pages/DashboardPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/DashboardPage.jsx)
   - very `xl`-heavy for a primary workspace
5. [`src/pages/EscalationSettingsPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/EscalationSettingsPage.jsx)
   - abrupt jump from stacked to `xl` split
6. [`src/pages/MonthlyViewPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/MonthlyViewPage.jsx)
   - acceptable but under-specified

---

## Recommended Standardization Rules

To make the application feel fully professional and consistent, use these project rules going forward:

### Rule 1

Toolbars with search + 2–4 filters should align horizontally by `lg`, not wait until `xl`.

### Rule 2

Two-panel workspaces should become "desktop usable" by `lg`, even if the final side rail treatment waits until `xl`.

### Rule 3

`xl` should be reserved for:

- sticky rails
- map side panels
- analytics side insights
- large dense workspace enhancements

### Rule 4

Do not introduce `2xl` unless it is enhancement-only.

### Rule 5

For page design reviews, classify pages into one of these responsive types:

- table-first page
- form-first page
- split workspace
- map workspace
- analytics dashboard

Each type should have a declared breakpoint pattern instead of each page inventing its own.

---

## Priority Fix Order

### P1

- [`src/pages/history/ArchiveFilters.jsx`](/Users/macbookair/Documents/IMMS/src/pages/history/ArchiveFilters.jsx)
- [`src/pages/master/customers/CustomerToolbar.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/customers/CustomerToolbar.jsx)

Reason:

- small scope
- high visible benefit
- immediately improves desktop consistency

### P2

- [`src/pages/master/DistribusiPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/master/DistribusiPage.jsx)
- [`src/pages/DashboardPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/DashboardPage.jsx)
- [`src/pages/EscalationSettingsPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/EscalationSettingsPage.jsx)

Reason:

- these are workspace-heavy pages where `lg` behavior should be improved before `xl`

### P3

- [`src/pages/MonthlyViewPage.jsx`](/Users/macbookair/Documents/IMMS/src/pages/MonthlyViewPage.jsx)
- map workspace documentation + explicit pattern hardening

Reason:

- lower operational risk
- refinement rather than defect

---

## Final Verdict

The project is already responsive and usable. The issue is no longer "broken responsiveness"; it is **breakpoint discipline maturity**.

Current state:

- consistent foundation: **yes**
- professional breakpoint standard across all pages: **not yet**
- easy to standardize from current architecture: **yes**

The codebase is close enough that this should be handled as a targeted standardization pass, not a redesign.
