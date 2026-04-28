# Nexaris UI/UX Design System Guidelines

This document serves as the single source of truth for UI standardization across the Nexaris product, ensuring that the legacy inline CSS habits are not repeated and that all views follow the unified utility-first architecture (Tailwind CSS v4 + DaisyUI v5).

## 1. Typography Hierarchy
- **Primary Font (`font-sans`):** **Inter** (or system fallback). Used for all body text, headings, buttons, and navigation.
- **Data Font (`font-mono`):** **JetBrains Mono** (or monospace). Strictly used for IDs, Timestamps, Durations, and quantitative data (numbers) to ensure tabular alignment and numerical readability.

## 2. Status & Colors (The `NCAL` System)
Always use the `src/utils/themeMap.js` or the `<NcalBadge>` component for mapping NCAL statuses, instead of hardcoding colors.

- **BLACK:** `badge-neutral` (Default)
- **RED / DANGER:** `badge-error` (Critical incidents) 
- **ORANGE / YELLOW:** `badge-warning` (Elevated issues)
- **BLUE:** `badge-info` (Information/Maintenance)
- **SUCCESS:** `badge-success` (Resolved/Clear)

## 3. Atomic Components & Buttons
When creating forms or actions, strictly use standard DaisyUI variants provided via the atomic `<Button>` and `<Input>` components in `src/components/ui/index.jsx`.

### Standard Button Mapping:
- **Save / Create / Submit:** `<Button variant="primary">` (maps to `btn-primary`)
- **Delete / Reject / Cancel:** `<Button variant="error">` (maps to `btn-error`)
- **Edit / Modify:** `<Button variant="warning">` (maps to `btn-warning` or `btn-ghost` for subtle edit buttons)
- **Secondary Actions:** `<Button variant="outline">` or `className="btn btn-ghost"`

### Example Usage:
```jsx
// Bad (Legacy)
<button className="custom-save-btn" style={{ background: 'blue' }}>Simpan</button>

// Good (Atomic Component)
<Button variant="primary" icon={<Save size={16} />}>Simpan Data</Button>
```

## 4. Loading & Empty States
- **Page Load / Layout Loads:** Avoid raw Spinners. Use DaisyUI **Skeleton** components (`TableSkeleton`, `CardSkeleton`) to reduce layout shift and provide a premium "loading" illusion.
- **Empty Data Views:** Always wrap empty arrays in the `<EmptyState>` component rather than displaying a blank screen or plain text.

## 5. Accessibility & Interaction
- Interactive components have a default smooth transition (`transition-all duration-300`).
- Any Icon Button (e.g. `<button><Trash size={16} /></button>`) MUST include an `aria-label` describing its action, and be wrapped in a tooltip `<div className="tooltip" data-tip="Delete Item">`.
