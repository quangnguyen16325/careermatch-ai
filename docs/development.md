# Local Development

## Environment

Copy `.env.example` to `.env`. Local defaults are intentionally non-production values. Generate new secrets for any shared or deployed environment.

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
