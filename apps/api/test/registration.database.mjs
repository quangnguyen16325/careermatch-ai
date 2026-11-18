// Run only against an explicitly disposable, migrated Docker test stack.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { PasswordService } from '../dist/auth/password.service.js';

assert.equal(
  process.env.REGISTRATION_TEST_DISPOSABLE,
  '1',
  'Requires explicit disposable test environment',
);
const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const suffix = randomUUID().replaceAll('-', '');
const prefix = `cm040-${suffix}`;
const trigger = `cm040_${suffix}`;
const sentinel = `ROLLBACK-${suffix}`;
const password = ' untouched-password-example ';
const api = process.env.REGISTRATION_TEST_API ?? 'http://127.0.0.1:3000';
const register = async (email, role = 'STUDENT', fullName = 'Test Person') => {
  const response = await fetch(`${api}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role, fullName }),
  });
  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
};

try {
  for (const role of ['STUDENT', 'EMPLOYER']) {
    const email = `${prefix}-${role.toLowerCase()}@example.com`;
    const response = await register(` ${email.toUpperCase()} `, role);
    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(response.body).sort(), [
      'email',
      'emailVerified',
      'id',
      'role',
      'status',
    ]);
    assert.equal(response.body.email, email);
    assert.equal(response.body.status, 'PENDING_VERIFICATION');
    assert.equal(response.body.emailVerified, null);
    assert.equal(response.headers.get('set-cookie'), null);
    const record = await database.user.findUniqueOrThrow({
      where: { email },
      include: { student: true, employer: true },
    });
    assert.equal(record.role, role);
    assert.equal(
      role === 'STUDENT' ? record.student.fullName : record.employer.fullName,
      'Test Person',
    );
    assert.equal(role === 'STUDENT' ? record.employer : record.student, null);
    assert.notEqual(record.passwordHash, password);
    assert.equal(
      await new PasswordService().verify(password, record.passwordHash),
      true,
    );
  }
  const duplicate = await register(`${prefix}-STUDENT@example.com`);
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.code, 'EMAIL_ALREADY_EXISTS');
  const race = await Promise.all([
    register(`${prefix}-race@example.com`),
    register(`${prefix}-race@example.com`),
  ]);
  assert.deepEqual(
    race.map((r) => r.status).sort((a, b) => a - b),
    [201, 409],
  );
  assert.equal(
    await database.user.count({
      where: { email: `${prefix}-race@example.com` },
    }),
    1,
  );

  // The trigger affects only this test's randomized sentinel name. Force a
  // database error after the parent User insert, proving the nested-write rollback.
  await database.$executeRawUnsafe(
    `CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."fullName" = '${sentinel}' THEN RAISE EXCEPTION 'forced test profile failure'; END IF; RETURN NEW; END $$`,
  );
  await database.$executeRawUnsafe(
    `CREATE TRIGGER "${trigger}" BEFORE INSERT ON "StudentProfile" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`,
  );
  const failed = await register(
    `${prefix}-rollback@example.com`,
    'STUDENT',
    sentinel,
  );
  assert.equal(failed.status, 500);
  assert.equal(failed.body.code, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(failed.body).includes('forced test'), false);
  assert.equal(
    await database.user.count({
      where: { email: `${prefix}-rollback@example.com` },
    }),
    0,
  );
  console.log(
    'PASS: real PostgreSQL registration, password verification, both profile types, duplicate/racing email and nested-write rollback',
  );
} finally {
  await database.$executeRawUnsafe(
    `DROP TRIGGER IF EXISTS "${trigger}" ON "StudentProfile"`,
  );
  await database.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${trigger}"()`);
  await database.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await database.$disconnect();
}
