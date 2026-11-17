// Creates/cleans only randomized accounts in an explicitly disposable test DB.
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { PasswordService } from '../dist/auth/password.service.js';

assert.equal(process.env.SESSION_TEST_DISPOSABLE, '1');
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const email = `cm041-${randomUUID()}@example.com`;
const password = 'untouched-password-example';
const base = process.env.SESSION_TEST_API ?? 'http://localhost:3000';
const origin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
let user;
const request = async (
  path,
  { body, cookie, token, method = 'POST', originValue = origin } = {},
) => {
  const headers = { Origin: originValue };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(base + '/api/v1/auth' + path, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: r.status,
    body: r.status === 204 ? null : await r.json(),
    cookie: r.headers.get('set-cookie')?.split(';')[0],
  };
};
const login = () => request('/login', { body: { email, password } });
const me = (token) => request('/me', { token, method: 'GET' });
const jwt = async (sid, options = {}) =>
  new SignJWT({ sid, role: 'ADMIN' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer(options.issuer ?? process.env.JWT_ISSUER ?? 'careermatch-api')
    .setAudience(
      options.audience ?? process.env.JWT_AUDIENCE ?? 'careermatch-web',
    )
    .setIssuedAt()
    .setExpirationTime(options.exp ?? '5m')
    .sign(
      new TextEncoder().encode(options.secret ?? process.env.JWT_ACCESS_SECRET),
    );

try {
  user = await db.user.create({
    data: {
      email,
      passwordHash: await new PasswordService().hash(password),
      role: 'STUDENT',
      status: 'PENDING_VERIFICATION',
      student: { create: { fullName: 'Session Fixture' } },
    },
  });
  assert.equal((await login()).body.code, 'EMAIL_NOT_VERIFIED');
  assert.equal(
    (
      await request('/login', {
        body: { email, password: 'wrong-password-example' },
      })
    ).body.code,
    'INVALID_CREDENTIALS',
  );
  assert.equal(
    (await request('/login', { body: { email: 'absent-' + email, password } }))
      .body.code,
    'INVALID_CREDENTIALS',
  );
  await db.user.update({
    where: { id: user.id },
    data: { status: 'SUSPENDED' },
  });
  assert.equal((await login()).body.code, 'ACCOUNT_SUSPENDED');
  await db.user.update({
    where: { id: user.id },
    data: { status: 'ACTIVE', emailVerified: new Date() },
  });
  const first = await login();
  assert.equal(first.status, 200);
  assert.equal(first.body.refreshToken, undefined);
  assert.equal(first.body.user.passwordHash, undefined);
  assert.match(first.cookie, /^careermatch_refresh=[A-Za-z0-9_-]{43}$/);
  assert.equal((await me(first.body.accessToken)).body.id, user.id);
  const tokenValue = first.cookie.split('=')[1];
  const record = await db.refreshToken.findUniqueOrThrow({
    where: {
      tokenDigest: createHash('sha256').update(tokenValue).digest('hex'),
    },
  });
  assert.notEqual(record.tokenDigest, tokenValue);
  const rotated = await request('/refresh', { cookie: first.cookie });
  assert.equal(rotated.status, 200);
  assert.notEqual(rotated.cookie, first.cookie);
  const replay = await request('/refresh', { cookie: first.cookie });
  assert.equal(replay.status, 401);
  assert.equal(
    (
      await db.authSession.findUniqueOrThrow({
        where: { id: record.sessionId },
      })
    ).revocationReason,
    'REUSE',
  );
  assert.equal((await me(rotated.body.accessToken)).status, 401);

  const second = await login();
  assert.equal(second.status, 200);
  const concurrent = await Promise.all([
    request('/refresh', { cookie: second.cookie }),
    request('/refresh', { cookie: second.cookie }),
  ]);
  assert.deepEqual(
    concurrent.map((r) => r.status).sort((a, b) => a - b),
    [200, 401],
  );
  const winning = concurrent.find((r) => r.status === 200);
  assert.equal((await me(winning.body.accessToken)).status, 401);

  // Fixture session lets expiry, signature, current role/status, and logout be
  // tested without weakening rate limits or making more password-login requests.
  const secret = randomBytes(32).toString('base64url');
  const session = await db.authSession.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 600000),
      refreshTokens: {
        create: {
          tokenDigest: createHash('sha256').update(secret).digest('hex'),
          expiresAt: new Date(Date.now() + 600000),
        },
      },
    },
  });
  const live = await jwt(session.id);
  assert.equal((await me(live)).body.role, 'STUDENT'); // stale ADMIN claim ignored
  for (const options of [
    { issuer: 'wrong' },
    { audience: 'wrong' },
    { secret: 'wrong-secret-'.repeat(4) },
    { exp: '-1s' },
  ])
    assert.equal((await me(await jwt(session.id, options))).status, 401);
  await db.user.update({
    where: { id: user.id },
    data: { status: 'SUSPENDED' },
  });
  assert.equal((await me(live)).body.code, 'ACCOUNT_SUSPENDED');
  await db.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } });
  await db.authSession.update({
    where: { id: session.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal((await me(live)).status, 401);
  await db.authSession.update({
    where: { id: session.id },
    data: { expiresAt: new Date(Date.now() + 600000) },
  });
  const cookie = 'careermatch_refresh=' + secret;
  assert.equal((await request('/logout', { cookie })).status, 204);
  assert.equal((await me(live)).status, 401);
  assert.equal((await request('/logout', { cookie })).status, 204);
  assert.equal((await request('/logout')).status, 204);
  assert.equal(
    (
      await request('/logout', {
        cookie,
        originValue: 'https://foreign.example',
      })
    ).status,
    403,
  );
  console.log(
    'PASS: real DB login/status, salted password, cookie/digest, rotation/replay/concurrency, JWT signature/issuer/audience/expiry, live role/status/session and idempotent logout',
  );
} finally {
  if (user) await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
