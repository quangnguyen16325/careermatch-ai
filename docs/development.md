# Local Development

See [the API integration contract](api-contracts.md) for the working Authentication,
Student Profile, CV, and FastAPI boundaries. It distinguishes implemented starter
endpoints from proposed routes so frontend mocks do not assume an API is available.

## Environment

Copy `.env.example` to `.env`. Local defaults are intentionally non-production values. Generate new secrets for any shared or deployed environment.

NestJS, Prisma CLI, Vite, and FastAPI all read the repository-root `.env`, independent
of the workspace working directory. Exported process variables take precedence
(including CI and deployment secrets). Workspace-local files such as `apps/api/.env`
and `services/ai/.env` are not loaded. Do not copy `.env` into multiple workspaces.
Vite also supports its normal mode-specific files at the root; only `VITE_`-prefixed
variables are exposed to client code. Never put secrets behind a `VITE_` name.

From the repository root (Linux/macOS/WSL or Git Bash):

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm db:validate
pnpm db:generate
```

PowerShell uses `Copy-Item .env.example .env`. Do not overwrite an existing `.env`;
compare it with the template and add missing keys. Prisma validation/generation
does not require a running database. Migration and connectivity verification are
separate CM-039 checks and require `pnpm infra:up` first.

When starting FastAPI from `services/ai`, the root `.env` is still used:

```bash
cd services/ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8001
```

For a production API build in the monorepo, run
`node apps/api/dist/main.js` from the root after `pnpm build`.
Without the workspace marker (for example a standalone deployment artifact),
NestJS uses injected process variables and does not search the working directory
for a different `.env`. Deployments must supply their environment explicitly.

## Database changes

Edit `apps/api/prisma/schema.prisma`, then run:

```bash
pnpm db:validate
pnpm db:migrate
```

Commit both the schema and generated migration. Never edit an applied migration.

## API rules

- All routes live below `/api/v1`.
- DTOs validate every request at the boundary.
- Errors use stable machine-readable codes.
- Role checks are not enough for private records; verify ownership too.
- Swagger must describe public request and response contracts.

## AI integration rules

- Begin with `LLM_PROVIDER=mock` so development and tests are deterministic.
- Validate AI responses against explicit schemas.
- Store model/provider/version and evidence used for every score.
- Do not send unnecessary personal data to an external provider.
- Do not use AI output to automatically accept or reject applicants.
