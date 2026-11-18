# Authorization — CM-042

Feature modules import `AuthModule` from `src/auth/auth.module.ts`. It exports
`AuthGuard`, `RolesGuard`, `OwnershipService`, and the existing session/database
providers. Shared decorators live in `src/common/decorators`; guards live in
`src/common/guards`. These paths also match the current company-profile branch.

Apply guards in this order and explicitly list allowed roles:

```ts
@UseFilters(RegistrationFilter)
@UseGuards(AuthGuard, RolesGuard)
@Roles("STUDENT")
@Controller("cvs")
export class CvController {
  constructor(private readonly ownership: OwnershipService) {}

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.ownership.cv(user, id);
  }
}
```

This is an integration example, not a delivered CV endpoint. Import decorators,
guards and types from their corresponding files and Nest decorators from
`@nestjs/common`. Use `RegistrationFilter` for the existing safe error envelope
and no-store/request-ID headers, despite its historical name.

`AuthGuard` clears any existing request principal and calls `SessionService.me`.
It validates the access JWT and checks the current database account/session on
every request. Revoked or expired sessions fail with 401; suspended accounts fail
with 403. The principal uses the current database role, not stale JWT claims or
client-submitted fields. `CurrentUser()` returns that principal;
`CurrentUser('id')` returns its ID. Never construct it from body/query parameters.
`GET /api/v1/auth/me` now uses this shared guard and decorator.

`RolesGuard` requires an authenticated principal. Method roles override class
roles; missing or empty role metadata denies access. ADMIN has no implicit bypass.
For any authenticated role without a role restriction, apply only `AuthGuard`.
Public health/registration/session entry points retain their existing policies;
these guards are not global. Adding the helper alone does not protect new routes.

## Student resource ownership

Call `OwnershipService` with the trusted principal before returning resources:

- `studentProfile(user)` finds the profile by the authenticated user's ID.
- `cv(user, cvId)` scopes the lookup to that student's CV and returns safe metadata.
- `analysis(user, cvId, analysisId)` requires both the correct parent CV and owner.

These methods allow ACTIVE STUDENT accounts only. EMPLOYER/ADMIN require separate
explicit business policies and cannot read private CVs through these helpers.
Malformed, absent and foreign resource IDs all return 404 RESOURCE_NOT_FOUND.
Queries filter by owner at the database boundary; storage keys are never returned.

The helpers support reads. Future mutations must include owner predicates in the
write itself, with transaction/locking where needed; an earlier ownership lookup
alone cannot prevent state changing between a check and a write. Downloads must
authorize before resolving a private storage key. Employer job/application scope
must be implemented with those feature modules, not inferred from a role alone.

## Validation

`pnpm --filter api test:e2e` checks the exported guards through test-only routes:
all nine Student/Employer/Admin combinations, anonymous/revoked/suspended users,
class/method overrides, and absent/empty policies. Production has no fixture routes.
Unit tests verify scoped queries and metadata redaction. The PostgreSQL integration
test creates two owners and verifies real cross-account and parent-mismatch rejection:

```bash
docker compose exec -T -e OWNERSHIP_TEST_DISPOSABLE=1 api node test/ownership.database.mjs
```

Run against a disposable stack only. Fixtures are randomized and removed afterward.
Docker CI runs this alongside registration, live-session and stack smoke tests.
[Email verification/password reset](account-recovery.md) are delivered in CM-043;
feature routes remain separately tracked and must adopt these policies when implemented.
