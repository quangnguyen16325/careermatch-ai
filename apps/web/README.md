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

Employer, candidate, and most admin business screens use local mock data and frontend state. The Admin Company Verification Queue is an exception: it reads and updates company verification through the Admin Companies API described below. The protected workspace shell also calls the authentication endpoints above. There is no login UI or browser end-to-end coverage yet. The workspace session request verifies identity for presentation; server-side authorization remains mandatory for protected data and actions.

## Admin Company Verification Queue

The queue is available in the Admin workspace and is backed by the Admin Companies API. It supports searching by company name or tax code, filtering by verification status, pagination, viewing the company fields returned by the API, and making verification decisions. Queue results are not sourced from mock data.

### API contract

Both endpoints require an authenticated `ADMIN` role and use the current workspace session's Bearer access token:

- `GET /api/v1/admin/companies?page=&pageSize=&status=&search=` returns `{ data, meta }`. `page` starts at 1, `pageSize` is 1–100 (default 20), `status` is an optional verification status, and `search` matches company name or tax code.
- `PATCH /api/v1/admin/companies/:id/verify` accepts `{ "status": "VERIFIED" | "REJECTED", "reason"?: string }` and returns the updated company record. A successful decision causes the frontend to request the queue again; search and status filters are retained.

The backend permits `PENDING → VERIFIED`, `PENDING → REJECTED`, `VERIFIED → REJECTED` (revoke verification), and `REJECTED → VERIFIED` (verify again). Repeating the current status is not allowed. Rejection requires a reason containing at least 10 characters after trimming. The DTO caps the reason at 1000 characters. The frontend validates these constraints before sending; the backend remains authoritative.

The queue handles the documented `400` transition/reason errors, `401` unauthenticated, `403` forbidden, and `404` company-not-found responses, along with network and service failures. A stale transition or uncertain mutation outcome offers a queue reload. If PATCH succeeds but the subsequent GET fails, the interface distinguishes the saved decision from the stale list and offers retry without repeating the mutation.

### Tests and manual QA

Run the frontend checks from the repository root:

```sh
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
```

Vitest covers API request/response handling, rejection-reason boundaries, supported status transitions, errors, and aborted GET responses. The repository does not configure a browser E2E or React DOM interaction test environment. Before release, manually verify the queue at mobile and desktop widths, keyboard navigation and Escape/focus behavior in details/decision dialogs, confirmation/disable behavior while submitting, and decision refresh/retry against an Admin session and running API.
