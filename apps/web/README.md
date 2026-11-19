# CareerMatch AI web frontend

React 19, TypeScript, Vite, Tailwind CSS 4, and Lucide React frontend for the CareerMatch AI application.

## Pages and workspace roles

- `/` or `/index.html` — public landing page.
- `/employer.html` — Employer company profile and job management; requires the `EMPLOYER` role.
- `/candidates.html` — Employer candidate search, review, and application status management; requires the `EMPLOYER` role.
- `/admin.html` — Admin dashboard, users, employers, job moderation, and reports; requires the `ADMIN` role.

Employer navigation links between `/employer.html` and `/candidates.html`. Admin sections are selected within `/admin.html`; they are not separate routes. The Vite dev server serves these HTML entry points directly (default: `http://localhost:5173`).

## Authentication and protected workspaces

Each Employer/Admin HTML entry wraps its workspace in `RoleProtectedLayout`. The layout starts in a loading state and does not render restricted page content until the session check succeeds. `workspaceSession.ts` sends `POST /auth/refresh` with browser credentials, then uses the returned short-lived access token in memory to request `GET /auth/me`. The role returned by the current backend identity response determines workspace access; role values from a URL or local storage are not used.

- A missing or expired session (`401`) shows the unauthenticated state. There is no login UI in this frontend; the user must establish a session using the supported authentication flow.
- A permission response (`403`) or a verified role mismatch shows the forbidden state.
- Network errors, unsuccessful unexpected responses, and malformed session responses fail closed and show the workspace unavailable state with a retry action.

Set `VITE_API_URL` to the API base URL, including `/api/v1` if needed. When it is unset, the frontend uses `/api/v1`. The Vite development server proxies `/api/v1` to `http://localhost:3000`; configure the API host or proxy for other environments. The API must allow the frontend origin and credentials according to the backend session configuration.

The browser guard controls workspace presentation and navigation only. It does not replace authorization: backend endpoints must independently verify the session, role, ownership, and permissions for every protected operation.

## Run and verify

From the repository root:

```sh
pnpm --filter web dev
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
```

On Windows, use `pnpm.cmd` as the command prefix. Tests use Vitest. There is currently no browser E2E or React DOM test environment configured.

## Source layout

- `src/App.tsx` and `src/main.tsx` — landing page and common application styles.
- `src/employer.tsx`, `src/candidates.tsx`, `src/admin.tsx` — protected workspace entry points.
- `src/components/ui/` — shared Button, Card, PageHeader, and StatusBadge components.
- `src/components/layout/` — shared employer workspace layout.
- `src/features/auth/` — session refresh and current-user lookup used by protected workspaces.
- `src/features/navigation/` — workspace role checks, active-link matching, and protected layout.
- `src/features/employer/` — company profile, jobs, candidates, and mock data.
- `src/features/admin/` — admin dashboard and moderation pages with mock data.

## Data and integration status

Employer, candidate, and admin business screens use local mock data and frontend state. Their business actions are not persisted to backend APIs. The protected workspace shell does call the authentication API endpoints described above. There is no login UI or browser end-to-end coverage yet. The workspace session request verifies identity for presentation; server-side authorization remains mandatory for protected data and actions.

## Admin report triage and analytics (CM-078)

The Admin Reports section is available from `/admin.html` → **Reports**. It presents the local report preview as a responsive table on larger screens and cards on smaller screens. Admins can search report content, filter by status and reported item type, sort by submission date, and open a report detail dialog with its handling history.

The preview workflow supports these status transitions:

- `Open` → `Reviewing`
- `Reviewing` → `Resolved` or `Dismissed`

Starting a review accepts an optional note. Resolving or dismissing requires a decision note of at least 10 non-whitespace characters. The dialog asks for confirmation before applying the transition. Applying an action updates the in-memory preview list and handling history only; it does not persist to a server and the interface labels these changes as preview-only.

The dashboard analytics are derived from the same report list used by triage. It shows total reports, counts by status, the processed rate, status distribution, and Job/Account target distribution. Processed means `Resolved` plus `Dismissed`; the displayed rate is rounded to the nearest whole percent of valid reports. Rows with unsupported status or target type are excluded from metrics, and invalid submission dates are omitted from the date series. Loading, empty, and error data states are distinct; current workspace data is mock preview data, not an API response.

### CM-078 verification

Run checks from the repository root:

```sh
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
```

Manual browser checklist (not covered by the current automated test setup):

- **Desktop:** search by report ID, reason, target, or reporter; combine filters; change sort order; open/close details; exercise each permitted status transition and cancel/confirm dialogs.
- **Tablet:** check that filters wrap, list controls remain reachable, and analytics cards/bars fit without clipping.
- **Mobile:** check report cards, detail and action dialogs, focus/keyboard operation, and that no page-level horizontal overflow hides controls.
- **All sizes:** verify empty data, no matching filters, and workspace loading/error presentations when those states are supplied.

The repository has Vitest unit tests but no configured browser E2E or React DOM component-test environment. Responsive layout, focus behavior, and dialog cancellation therefore require manual browser verification. Once backend report and analytics APIs are available, replace the local preview source with the agreed API contract, handle server authorization/errors, and add integration coverage; do not treat the current frontend preview actions as persisted moderation.
