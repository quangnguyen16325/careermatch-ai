# Login and JWT sessions — CM-041

Implemented under `/api/v1/auth`: POST login, POST refresh, POST logout, GET me.
Only ACTIVE accounts can sign in. [Verification and password recovery](account-recovery.md)
are implemented in CM-043; pending accounts must verify their email before login.
Reusable role/ownership checks are delivered in CM-042; see
[authorization](authorization.md) before implementing protected feature routes.

## Client contract

Login accepts email/password, normalizes email, and preserves the exact password.
It returns public User, accessToken, tokenType Bearer, and expiresIn seconds.
No raw refresh token is returned in JSON. Keep the access token in memory and
send it as Authorization: Bearer. The browser stores the refresh token only in a
host-only HttpOnly cookie named careermatch_refresh, Path=/api/v1/auth, SameSite=Lax.
Use credentials: include on login/refresh/logout. Origin must exactly equal
WEB_ORIGIN for all three POST routes; browser clients send it automatically.

POST refresh has no JSON payload. It rotates the cookie and returns only accessToken,
tokenType and expiresIn. Refresh must be single-flight: concurrent reuse of one
token revokes the family, requiring a fresh login. Invalid refresh clears the cookie.
POST logout revokes only that session and returns 204, including when already logged
out. Existing access tokens for that family immediately fail live session checks.

GET me verifies signature, issuer/audience, JWT type/expiry, required sub/sid/role/
iat/exp, UUID IDs, and an unrevoked/unexpired session linked to the current User.
It returns the database role, not a stale token role. Suspended accounts are denied.
Wrong and unknown login credentials share INVALID_CREDENTIALS; both incur scrypt
work. Correct credentials are required before revealing unverified/suspended status.

Errors use safe codes and no-store headers. Pre-routing JSON/body-size failures
still use Nest's framework format. Sending refresh credentials or access tokens in
logs/URLs is not supported. Use localhost consistently rather than mixing it with
127.0.0.1 for browser cookies.

## Configuration and storage

- JWT_ACCESS_SECRET: at least 32 bytes; missing/short values fail closed when a
  session endpoint is used. Provide a random secret outside local demos.
- JWT_ACCESS_TTL: positive value with s/m/h/d unit, default 15m, maximum 1 day.
- JWT_REFRESH_TTL: same format, default 7d, maximum 30 days.
- JWT_ISSUER / JWT_AUDIENCE: defaults careermatch-api / careermatch-web.
- AUTH_COOKIE_SECURE: true for HTTPS. Defaults true under production unless
  explicitly overridden. Local HTTP Compose and the example file use false.
- WEB_ORIGIN: exact frontend origin; Compose derives it from WEB_PORT.

Access JWTs use jose/HS256 and their expiry cannot exceed the session expiry.
Changing the signing key invalidates existing access tokens; key rollover is not
implemented. JWT_REFRESH_SECRET is a legacy unused template key: refresh tokens
are opaque random values, stored only as SHA-256 digests, not signed JWTs.

The additive migration creates AuthSession and RefreshToken with foreign keys,
unique digests, expiry and revocation indexes. It does not rewrite old migrations.
Session lifetime is absolute and does not slide during refresh. Consumed token
records remain available for reuse detection; a safe retention job is future work.

Refresh locks the PostgreSQL session row, rechecks all state, consumes the old
token, and inserts a replacement in one transaction. Replay revocation commits
before returning 401. Logout takes the same lock. Unknown digests do not revoke
unrelated sessions. Login locks User and rechecks credentials/status before
creating a session. Password reset takes that User lock and revokes every session
atomically. Future suspension writes must coordinate using the same lock.

Session login/refresh and registration use separate bounded in-process quotas
(10 per socket address per minute each). Password verification allows two active
jobs per process. Behind Nginx clients share the proxy socket quota; distributed
limiting and trusted-proxy handling remain production prerequisites. Database
outages fail closed rather than bypassing session validation.

## Tests

HTTP tests cover validation/normalization, missing/foreign Origins, cookie flags
and scope, token redaction, refresh error clearing, idempotent bodyless logout,
TTL bounds and malformed/ambiguous cookie parsing.

The disposable PostgreSQL test covers account states, wrong/unknown credentials,
digest storage, rotation/replay, racing refresh requests, immediate logout, live
role/status, expired sessions, and JWT signature/issuer/audience/expiry rejection.
It creates randomized accounts and cleans them with cascading session records.

```bash
docker compose exec -T -e SESSION_TEST_DISPOSABLE=1 api node test/sessions.database.mjs
```

Run only on a disposable stack. Public deployment, UAT and cross-site cookie
hosting remain separate work; see CM-043 for email/recovery delivery limitations.

References: [jose signing](https://github.com/panva/jose/blob/main/docs/jwt/sign/classes/SignJWT.md)
and [JWT verification](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md).
