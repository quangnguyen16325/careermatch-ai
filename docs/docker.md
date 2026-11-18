# Local full-stack Docker setup

CM-039. This Compose stack is for local development/demo, not production deployment.
It runs PostgreSQL/pgvector, Redis, a one-shot migration job, NestJS, mock FastAPI,
and a built frontend served by Nginx. Feature APIs that are not implemented remain
unavailable; running containers does not mean the MVP is complete.

## First start

Install/start Docker with Compose v2.20+ (including support for `up --wait`). From
the repository root, copy `.env.example` to `.env` once, then run:

```bash
cp .env.example .env
docker compose up -d --build --wait --wait-timeout 180
docker compose ps -a
```

Use `Copy-Item .env.example .env` in PowerShell. Do not overwrite an existing `.env`.
The startup command itself needs no local Node, pnpm, or Python installation.
Initial builds require network access and take longer than later starts.
Optional pnpm shortcuts: `pnpm stack:up`, `pnpm stack:logs`, `pnpm stack:down`.

Expected result: five long-running services are healthy; `migrate` is **Exited (0)**,
which is intentional. Migration failure prevents API startup; unhealthy dependencies
prevent their dependent services from starting. Inspect logs instead of resetting data.
Health gates apply at startup, not continuous dependency recovery.

- Frontend: http://localhost:5173
- API through frontend proxy: http://localhost:5173/api/v1/health
- Swagger through proxy: http://localhost:5173/docs
- Direct API: http://localhost:3000/api/v1/health
- AI docs: http://localhost:8001/docs

All published ports bind to localhost. In containers, API uses `postgres:5432`,
`redis:6379`, and `ai:8001`, not host localhost. Browser requests use same-origin
`/api/v1`; Nginx proxies to API. Do not place Docker service names in frontend URLs.

Host port variables are `WEB_PORT`, `API_PORT`, `AI_SERVICE_PORT`, `POSTGRES_PORT`,
and `REDIS_PORT`. Internal container ports remain fixed. For non-default credentials
containing URL-special characters, supply a URI-encoded `DOCKER_DATABASE_URL` whose
host is `postgres`; it overrides the generated container URL. Host-development
`DATABASE_URL` is intentionally not reused inside containers.

Compose explicitly injects service configuration. `.env` files, node_modules,
local CVs, and git history are excluded from image build contexts. Root `.env` is
read by Compose for substitution, not copied into images. Build the web target
with `VITE_API_URL=/api/v1`; changing a host-development VITE_API_URL does not
override this Docker proxy setting. Keep `LLM_PROVIDER=mock` for smoke tests.

## Updates, data, and mixed development

After pulling changes, repeat `docker compose up -d --build --wait`. Builds are
snapshots: source edits are not live-mounted. Use `pnpm dev` and a local AI process
for hot reload. Do not run host and Docker services on the same published ports.
For host development, start only infrastructure with `pnpm infra:up`.

The migrate service uses `prisma migrate deploy`: it applies committed migrations
without generating new ones or resetting the database. Create new migrations in
the normal host development workflow and commit them before rebuilding.

Named volumes preserve PostgreSQL, Redis AOF, and CV storage across container
recreation and `docker compose down`. `down --volumes` destroys those volumes:
use it only for explicitly disposable environments. Changes to POSTGRES_USER/
PASSWORD/DB do not reinitialize an existing Postgres volume; plan a migration or
use a separate disposable Compose project rather than deleting shared data.

```bash
docker compose logs --tail=100 migrate api ai
docker compose exec postgres pg_isready -U careermatch -d careermatch
docker compose exec redis redis-cli ping
docker compose run --rm migrate pnpm exec prisma migrate status
docker compose down
```

The sample psql/pg_isready commands assume default local credentials. CV byte
storage uses the `cv_data` volume and API runs as a non-root user. Database schema
relations do not by themselves implement CV upload, deletion, or storage cleanup.

## Verification

With Python 3 available on the host, `python3 scripts/smoke-stack.py` checks web,
SPA fallback, proxied/direct API, Swagger, mock CV analysis, and advisory matching.
Custom ports are supported through `--web`, `--api`, and `--ai` base URLs.
The Docker smoke workflow builds and starts a disposable stack, checks these
routes and migration status, then verifies a repeat start and removes CI volumes.

For an isolated local check, set a distinct `COMPOSE_PROJECT_NAME` and free host
ports on **every** Compose invocation, including stop commands. This keeps the
test stack and named volumes separate from a team's normal project. API/AI images
include the monorepo-compatible paths expected by environment configuration.

Local default credentials and HTTP are not a production configuration. The API
image retains development tooling for Prisma migration; image minimization,
production secrets/TLS, resource limits, and backup operations remain deployment work.
