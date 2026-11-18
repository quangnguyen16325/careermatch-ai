import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { PasswordService } from '../dist/auth/password.service.js';
import { RegistrationService } from '../dist/auth/registration.service.js';
import { RecoveryService } from '../dist/auth/recovery.service.js';
import { AccountMailService } from '../dist/auth/account-mail.service.js';
import { SessionService } from '../dist/auth/session.service.js';

assert.equal(process.env.RECOVERY_TEST_DISPOSABLE, '1');
assert.equal(
  process.env.MAIL_MODE,
  'local',
  'Never run email fixtures against real SMTP',
);
assert.equal(process.env.SMTP_HOST, 'mailpit');
const client = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const db = { client },
  config = new ConfigService(process.env),
  passwords = new PasswordService();
const recovery = new RecoveryService(
  db,
  passwords,
  new AccountMailService(config),
  config,
);
const registration = new RegistrationService(db, passwords);
const sessions = new SessionService(db, passwords, config);
const users = [];
const mailIds = [];
const hash = (token) => createHash('sha256').update(token).digest('hex');
const invalid = (code) => (error) =>
  error.getStatus() === 400 && error.getResponse().code === code;
async function emailToken(email, purpose) {
  const response = await fetch(
    'http://127.0.0.1:3000/api/v1/auth/' +
      (purpose === 'VERIFY_EMAIL' ? 'resend-verification' : 'forgot-password'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
  );
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    message: `If eligible, ${purpose === 'VERIFY_EMAIL' ? 'verification' : 'password reset'} instructions will be sent.`,
  });
  let message;
  for (let i = 0; i < 100; i++) {
    const messages = await (
      await fetch('http://mailpit:8025/api/v1/messages')
    ).json();
    message = messages.messages.find(
      (m) =>
        m.To.some((to) => to.Address === email) &&
        m.Subject ===
          (purpose === 'VERIFY_EMAIL'
            ? 'Verify your CareerMatch AI email'
            : 'Reset your CareerMatch AI password'),
    );
    if (message) break;
    await delay(100);
  }
  assert.ok(message, 'Expected captured SMTP message');
  mailIds.push(message.ID);
  const content = await (
    await fetch('http://mailpit:8025/api/v1/message/' + message.ID)
  ).json();
  const token = /#token=([A-Za-z0-9_-]{43})/.exec(content.Text)?.[1];
  assert.ok(token, 'Email must contain fragment token');
  return token;
}
async function seedToken(userId, purpose, data = {}) {
  const user = await client.user.findUniqueOrThrow({ where: { id: userId } });
  const raw = randomUUID().replaceAll('-', '') + 'a'.repeat(11);
  await client.accountToken.create({
    data: {
      userId,
      email: user.email,
      purpose,
      tokenDigest: hash(raw),
      expiresAt: new Date(Date.now() + 60000),
      ...data,
    },
  });
  return raw;
}
async function post(path, body) {
  return fetch('http://127.0.0.1:3000/api/v1/auth/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
try {
  const password = 'initial-password-2026';
  const user = await registration.register({
    email: `cm043-${randomUUID()}@example.com`,
    password,
    role: 'STUDENT',
    fullName: 'Recovery fixture',
  });
  users.push(user.id);
  const older = await seedToken(user.id, 'VERIFY_EMAIL', {
    createdAt: new Date(Date.now() - 120000),
  });
  const verification = await emailToken(user.email, 'VERIFY_EMAIL');
  await assert.rejects(
    () => recovery.consume(older, 'VERIFY_EMAIL'),
    invalid('INVALID_VERIFICATION_TOKEN'),
  );
  const row = await client.accountToken.findUniqueOrThrow({
    where: { tokenDigest: hash(verification) },
  });
  assert.notEqual(row.tokenDigest, verification);
  assert.equal(row.purpose, 'VERIFY_EMAIL');
  assert.ok(row.expiresAt > new Date());
  // Same-purpose cooldown does not issue a replacement or duplicate mail.
  recovery.request(user.email, 'VERIFY_EMAIL');
  await recovery.onModuleDestroy();
  assert.equal(
    await client.accountToken.count({ where: { userId: user.id } }),
    2,
  );
  await assert.rejects(
    () => recovery.consume(verification, 'RESET_PASSWORD', 'some-new-password'),
    invalid('INVALID_RESET_TOKEN'),
  );
  const race = await Promise.all([
    post('verify-email', { token: verification }),
    post('verify-email', { token: verification }),
  ]);
  assert.deepEqual(race.map((r) => r.status).sort(), [204, 400]);
  await assert.rejects(
    () => recovery.consume(verification, 'VERIFY_EMAIL'),
    invalid('INVALID_VERIFICATION_TOKEN'),
  );
  const active = await client.user.findUniqueOrThrow({
    where: { id: user.id },
  });
  assert.equal(active.status, 'ACTIVE');
  assert.ok(active.emailVerified);
  const login = await sessions.login({ email: user.email, password });
  const second = await sessions.login({ email: user.email, password });
  const reset = await emailToken(user.email, 'RESET_PASSWORD');
  const freshPassword = '  replacement password  ';
  const resetRace = await Promise.all([
    post('reset-password', { token: reset, newPassword: freshPassword }),
    post('reset-password', { token: reset, newPassword: freshPassword }),
  ]);
  assert.deepEqual(resetRace.map((r) => r.status).sort(), [204, 400]);
  await assert.rejects(
    () => sessions.me('Bearer ' + login.accessToken),
    (error) => error.getStatus() === 401,
  );
  await assert.rejects(
    () => sessions.me('Bearer ' + second.accessToken),
    (error) => error.getStatus() === 401,
  );
  await assert.rejects(
    () => sessions.refresh(login.refreshToken),
    (error) => error.getStatus() === 401,
  );
  await assert.rejects(
    () => sessions.login({ email: user.email, password }),
    (error) => error.getStatus() === 401,
  );
  assert.ok(
    (await sessions.login({ email: user.email, password: freshPassword }))
      .accessToken,
  );
  await assert.rejects(
    () => recovery.consume(reset, 'RESET_PASSWORD', freshPassword),
    invalid('INVALID_RESET_TOKEN'),
  );
  const oldEmail = await seedToken(user.id, 'RESET_PASSWORD');
  await client.user.update({
    where: { id: user.id },
    data: { email: `changed-${randomUUID()}@example.com` },
  });
  await assert.rejects(
    () => recovery.consume(oldEmail, 'RESET_PASSWORD', freshPassword),
    invalid('INVALID_RESET_TOKEN'),
  );
  await client.user.update({
    where: { id: user.id },
    data: { email: user.email },
  });
  const expired = await seedToken(user.id, 'RESET_PASSWORD', {
    expiresAt: new Date(Date.now() - 1000),
  });
  await assert.rejects(
    () => recovery.consume(expired, 'RESET_PASSWORD', freshPassword),
    invalid('INVALID_RESET_TOKEN'),
  );
  await client.user.update({
    where: { id: user.id },
    data: { status: 'SUSPENDED' },
  });
  const suspended = await seedToken(user.id, 'RESET_PASSWORD');
  await assert.rejects(
    () => recovery.consume(suspended, 'RESET_PASSWORD', freshPassword),
    invalid('INVALID_RESET_TOKEN'),
  );
  const count = await client.accountToken.count({ where: { userId: user.id } });
  recovery.request(user.email, 'RESET_PASSWORD');
  recovery.request(`unknown-${randomUUID()}@example.com`, 'RESET_PASSWORD');
  await recovery.onModuleDestroy();
  assert.equal(
    await client.accountToken.count({ where: { userId: user.id } }),
    count,
  );
  console.log(
    'PASS: SMTP fragment links, hashed tokens, cooldown, purpose/expiry/replay checks, concurrent verification/reset, password replacement, all-session revocation and inactive/unknown request handling',
  );
} finally {
  await recovery.onModuleDestroy();
  for (const id of users) await client.user.delete({ where: { id } });
  if (mailIds.length)
    await fetch('http://mailpit:8025/api/v1/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: mailIds }),
    });
  await client.$disconnect();
}
