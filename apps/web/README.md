# CareerMatch AI web frontend

React 19, TypeScript, Vite, Tailwind CSS 4, and Lucide React frontend for the CareerMatch AI wireframes.

## Pages

- `/` or `/index.html` — public landing page
- `/employer.html` — employer company profile and job management
- `/candidates.html` — candidate search, review, and application status management
- `/admin.html` — admin dashboard, users, employers, job moderation, and reports

The Vite dev server serves these HTML entry points directly (default: `http://localhost:5173`).

## Run and verify

From the repository root:

```sh
pnpm --filter web dev
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
```

On Windows, the equivalent command prefix is `pnpm.cmd`.

## Source layout

- `src/App.tsx` and `src/main.tsx` — landing page and common application styles
- `src/employer.tsx`, `src/candidates.tsx`, `src/admin.tsx` — separate workspace entry points
- `src/components/ui/` — shared Button, Card, PageHeader, and StatusBadge components
- `src/components/layout/` — shared employer workspace layout
- `src/features/employer/` — company profile, jobs, candidates, and their mock data
- `src/features/admin/` — admin dashboard and moderation pages with mock data

## Data and integration status

Employer, candidate, and admin pages currently use local mock data and frontend state. Changes made in a page are a wireframe preview and are not persisted to a backend. These screens do not call an API; backend integration remains future work.

## Review verification

The Employer/Admin previews were checked in Chrome at 1440px and 390px widths.
Checks cover all four HTML entry points, draft validation/save, admin navigation,
candidate status progression, nested rejection/resume/report dialogs, keyboard Tab
containment, Escape dismissal and focus restoration. Shared dialogs use the native
modal API so background controls are inert. Cancelling a nested action keeps its
parent detail view open. These checks validate mock interactions; API integration,
role-protected routing and persistence remain separate tasks.
