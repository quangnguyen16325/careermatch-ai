import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { OwnershipService } from '../dist/auth/ownership.service.js';

assert.equal(process.env.OWNERSHIP_TEST_DISPOSABLE, '1');
const client = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const service = new OwnershipService({ client });
const created = [];
try {
  for (let n = 0; n < 2; n++)
    created.push(
      await client.user.create({
        data: {
          email: `cm042-${randomUUID()}@example.com`,
          passwordHash: 'test-only-not-a-login',
          role: 'STUDENT',
          status: 'ACTIVE',
          student: {
            create: {
              fullName: 'Ownership Fixture',
              cvs: {
                create: {
                  originalName: 'sample.pdf',
                  storageKey: randomUUID(),
                  mimeType: 'application/pdf',
                  sizeBytes: 100,
                  analyses: { create: { provider: 'mock', model: 'fixture' } },
                },
              },
            },
          },
        },
        include: {
          student: { include: { cvs: { include: { analyses: true } } } },
        },
      }),
    );
  const [owner, other] = created;
  const cv = owner.student.cvs[0];
  const analysis = cv.analyses[0];
  const wrongCv = other.student.cvs[0];
  assert.equal((await service.studentProfile(owner)).id, owner.student.id);
  assert.equal((await service.cv(owner, cv.id)).id, cv.id);
  assert.equal((await service.cv(owner, cv.id)).storageKey, undefined);
  assert.equal(
    (await service.analysis(owner, cv.id, analysis.id)).id,
    analysis.id,
  );
  for (const op of [
    () => service.cv(other, cv.id),
    () => service.cv(other, randomUUID()),
    () => service.cv(other, 'invalid'),
    () => service.analysis(other, cv.id, analysis.id),
    () => service.analysis(owner, wrongCv.id, analysis.id),
  ]) {
    await assert.rejects(
      op,
      (error) =>
        error.getStatus() === 404 &&
        error.getResponse().code === 'RESOURCE_NOT_FOUND',
    );
  }
  for (const role of ['EMPLOYER', 'ADMIN'])
    await assert.rejects(
      () => service.cv({ ...owner, role }, cv.id),
      (error) => error.getStatus() === 403,
    );
  console.log(
    'PASS: real PostgreSQL owner profile/CV/analysis access and foreign/missing/parent-mismatch/role rejection',
  );
} finally {
  for (const user of created)
    await client.user.delete({ where: { id: user.id } });
  await client.$disconnect();
}
