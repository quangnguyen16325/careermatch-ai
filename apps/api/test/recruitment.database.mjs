// Real PostgreSQL integration & concurrency regression tests for recruitment modules.
// Run only against an explicitly disposable test stack (RECRUITMENT_TEST_DISPOSABLE=1).
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { CompaniesService } from '../dist/companies/companies.service.js';
import { JobsService } from '../dist/jobs/jobs.service.js';
import { UpdateJobDto } from '../dist/jobs/dto/update-job.dto.js';
import { UpdateCompanyDto } from '../dist/companies/dto/update-company.dto.js';

assert.equal(
  process.env.RECRUITMENT_TEST_DISPOSABLE,
  '1',
  'Requires explicit disposable test environment (RECRUITMENT_TEST_DISPOSABLE=1)',
);

const client = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const db = { client };
const companiesService = new CompaniesService(db);
const jobsService = new JobsService(db);

const createdUsers = [];
const createdCompanies = [];
const createdJobs = [];

const prefix = `test-${randomUUID().slice(0, 8)}`;

async function createEmployer(hasCompany = false) {
  const email = `${prefix}-emp-${randomUUID().slice(0, 6)}@example.com`;
  const user = await client.user.create({
    data: {
      email,
      passwordHash: 'test-hash-not-real',
      role: 'EMPLOYER',
      status: 'ACTIVE',
      emailVerified: new Date(),
      employer: {
        create: {
          fullName: 'Test Recruiter',
        },
      },
    },
    include: { employer: true },
  });
  createdUsers.push(user.id);

  if (hasCompany) {
    const taxCode = `tax-${randomUUID().slice(0, 10)}`;
    const comp = await client.company.create({
      data: {
        name: `${prefix} Corp`,
        taxCode,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
    createdCompanies.push(comp.id);
    await client.employerProfile.update({
      where: { id: user.employer.id },
      data: { companyId: comp.id },
    });
    user.employer.companyId = comp.id;
    user.employer.company = comp;
  }

  return user;
}

async function createAdmin() {
  const email = `${prefix}-adm-${randomUUID().slice(0, 6)}@example.com`;
  const user = await client.user.create({
    data: {
      email,
      passwordHash: 'test-hash-not-real',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
  });
  createdUsers.push(user.id);
  return user;
}

try {
  console.log('🧪 Starting real PostgreSQL recruitment regression tests...');

  // =========================================================================
  // 1. Concurrent Company Creation for the same Employer
  // =========================================================================
  console.log('  Testing concurrent company creation...');
  const employer1 = await createEmployer(false);
  const tax1 = `tax-${randomUUID().slice(0, 10)}`;
  const tax2 = `tax-${randomUUID().slice(0, 10)}`;

  const createResults = await Promise.allSettled([
    companiesService.create(employer1.id, {
      name: `${prefix} Alpha Corp`,
      taxCode: tax1,
    }),
    companiesService.create(employer1.id, {
      name: `${prefix} Beta Corp`,
      taxCode: tax2,
    }),
  ]);

  const fulfilledCreate = createResults.filter((r) => r.status === 'fulfilled');
  const rejectedCreate = createResults.filter((r) => r.status === 'rejected');

  assert.equal(
    fulfilledCreate.length,
    1,
    'Expected exactly 1 concurrent company creation to succeed',
  );
  assert.equal(
    rejectedCreate.length,
    1,
    'Expected exactly 1 concurrent company creation to be rejected',
  );

  const error = rejectedCreate[0].reason;
  assert.equal(
    error.getStatus ? error.getStatus() : error.status,
    400,
    'Losing concurrent company create must throw 400 Bad Request',
  );
  assert.equal(
    error.getResponse ? error.getResponse().code : error.code,
    'COMPANY_ALREADY_EXISTS',
    'Losing concurrent company create must have code COMPANY_ALREADY_EXISTS',
  );

  // Track the winning company for cleanup
  const winningCompany = fulfilledCreate[0].value;
  createdCompanies.push(winningCompany.id);

  // Verify DB state: Employer has winning company, and losing company was rolled back (no orphaned company)
  const updatedEmployer = await client.employerProfile.findUnique({
    where: { userId: employer1.id },
  });
  assert.equal(updatedEmployer.companyId, winningCompany.id);

  const orphanedCompany = await client.company.findFirst({
    where: {
      taxCode:
        winningCompany.taxCode === tax1 ? tax2 : tax1,
    },
  });
  assert.equal(
    orphanedCompany,
    null,
    'Losing company insert must be rolled back; no orphaned company in database',
  );
  console.log('  ✓ PASS: Concurrent company creation claimed atomically without orphan rows');

  // =========================================================================
  // 2. Editing versus Publication State Race
  // =========================================================================
  console.log('  Testing editing versus publication race condition...');
  const employer2 = await createEmployer(true);

  // Create a draft job
  const draftJob = await client.job.create({
    data: {
      companyId: employer2.employer.companyId,
      title: 'Original Draft Title',
      description: 'Original description for the role that is at least 10 chars.',
      status: 'DRAFT',
    },
  });
  createdJobs.push(draftJob.id);

  // Simulate concurrent publication: job becomes PUBLISHED before edit write
  await client.job.update({
    where: { id: draftJob.id },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });

  // Attempt to update the now-PUBLISHED job via updateJob
  await assert.rejects(
    () =>
      jobsService.updateJob(employer2.id, draftJob.id, {
        title: 'Hacked Title on Published Job',
      }),
    (err) => {
      const code = err.getResponse ? err.getResponse().code : err.code;
      return code === 'CANNOT_EDIT_JOB';
    },
    'Updating a concurrently published job must be rejected with CANNOT_EDIT_JOB',
  );

  // Verify published job was NOT modified in the database
  const untouchedJob = await client.job.findUnique({
    where: { id: draftJob.id },
  });
  assert.equal(
    untouchedJob.title,
    'Original Draft Title',
    'Published job title must not be modified by concurrent draft edit',
  );
  console.log('  ✓ PASS: Concurrent edit on published job rejected atomically');

  // =========================================================================
  // 3. Conflicting Admin Moderation (Simultaneous Approve vs Reject)
  // =========================================================================
  console.log('  Testing conflicting simultaneous admin moderation...');
  const admin1 = await createAdmin();
  const admin2 = await createAdmin();

  const pendingJob = await client.job.create({
    data: {
      companyId: employer2.employer.companyId,
      title: 'Pending Moderation Job',
      description: 'Job awaiting administrative review and approval.',
      status: 'PENDING_APPROVAL',
    },
  });
  createdJobs.push(pendingJob.id);

  // Both admins decide simultaneously
  const moderationResults = await Promise.allSettled([
    jobsService.adminModerate(admin1.id, pendingJob.id, {
      status: 'PUBLISHED',
    }),
    jobsService.adminModerate(admin2.id, pendingJob.id, {
      status: 'REJECTED',
      reason: 'Job posting description lacks necessary technical details',
    }),
  ]);

  const fulfilledMod = moderationResults.filter((r) => r.status === 'fulfilled');
  const rejectedMod = moderationResults.filter((r) => r.status === 'rejected');

  assert.equal(
    fulfilledMod.length,
    1,
    'Expected exactly 1 admin moderation decision to succeed',
  );
  assert.equal(
    rejectedMod.length,
    1,
    'Expected exactly 1 admin moderation decision to be rejected due to conflict',
  );

  const modError = rejectedMod[0].reason;
  assert.equal(
    modError.getResponse ? modError.getResponse().code : modError.code,
    'INVALID_STATE_TRANSITION',
    'Conflicting moderation must throw INVALID_STATE_TRANSITION',
  );

  // Verify audit logs in database: only 1 moderation audit record exists
  const auditLogs = await client.auditLog.findMany({
    where: {
      entity: 'Job',
      entityId: pendingJob.id,
      action: { in: ['JOB_APPROVED', 'JOB_REJECTED'] },
    },
  });
  assert.equal(
    auditLogs.length,
    1,
    'Database must record exactly 1 moderation audit entry without contradiction',
  );

  // Verify notification in database: exactly 1 moderation notification exists
  const notifications = await client.notification.findMany({
    where: {
      type: { in: ['JOB_APPROVED', 'JOB_REJECTED'] },
      data: { path: ['jobId'], equals: pendingJob.id },
    },
  });
  assert.equal(
    notifications.length,
    1,
    'Employer must receive exactly 1 non-contradictory notification',
  );
  console.log('  ✓ PASS: Conflicting admin decisions resolved atomically without contradictory records');

  // =========================================================================
  // 4. Null PATCH Values Validation & Handling
  // =========================================================================
  console.log('  Testing PATCH null values rejection...');

  // UpdateJobDto validation
  const invalidJobDto1 = plainToInstance(UpdateJobDto, { skills: null });
  const errors1 = await validate(invalidJobDto1);
  assert.ok(
    errors1.some((e) => e.property === 'skills'),
    'UpdateJobDto must reject { skills: null }',
  );

  const invalidJobDto2 = plainToInstance(UpdateJobDto, { title: null });
  const errors2 = await validate(invalidJobDto2);
  assert.ok(
    errors2.some((e) => e.property === 'title'),
    'UpdateJobDto must reject { title: null } for non-null column',
  );

  const invalidJobDto3 = plainToInstance(UpdateJobDto, { description: null });
  const errors3 = await validate(invalidJobDto3);
  assert.ok(
    errors3.some((e) => e.property === 'description'),
    'UpdateJobDto must reject { description: null } for non-null column',
  );

  const emptyJobDto = plainToInstance(UpdateJobDto, {});
  const emptyErrors = await validate(emptyJobDto);
  assert.equal(
    emptyErrors.length,
    0,
    'UpdateJobDto must accept empty object {} without errors',
  );

  // UpdateCompanyDto validation
  const invalidCompDto = plainToInstance(UpdateCompanyDto, { name: null });
  const compErrors = await validate(invalidCompDto);
  assert.ok(
    compErrors.some((e) => e.property === 'name'),
    'UpdateCompanyDto must reject { name: null } for non-null column',
  );

  const emptyCompDto = plainToInstance(UpdateCompanyDto, {});
  const emptyCompErrors = await validate(emptyCompDto);
  assert.equal(
    emptyCompErrors.length,
    0,
    'UpdateCompanyDto must accept empty object {} without errors',
  );

  // Nullable column in Company (description: null) should be accepted
  const nullableCompDto = plainToInstance(UpdateCompanyDto, { description: null });
  const nullableCompErrors = await validate(nullableCompDto);
  assert.equal(
    nullableCompErrors.length,
    0,
    'UpdateCompanyDto should allow setting nullable column (description: null)',
  );

  console.log('  ✓ PASS: PATCH DTOs reject nulls on required columns and accept empty objects');

  console.log('🎉 ALL real PostgreSQL recruitment regression tests PASSED!');
} finally {
  console.log('🧹 Cleaning up test fixtures...');
  for (const jobId of createdJobs) {
    await client.jobSkill.deleteMany({ where: { jobId } }).catch(() => {});
    await client.auditLog.deleteMany({ where: { entityId: jobId } }).catch(() => {});
    await client.job.deleteMany({ where: { id: jobId } }).catch(() => {});
  }
  for (const compId of createdCompanies) {
    await client.auditLog.deleteMany({ where: { entityId: compId } }).catch(() => {});
    await client.employerProfile
      .updateMany({ where: { companyId: compId }, data: { companyId: null } })
      .catch(() => {});
    await client.company.deleteMany({ where: { id: compId } }).catch(() => {});
  }
  for (const userId of createdUsers) {
    await client.notification.deleteMany({ where: { userId } }).catch(() => {});
    await client.employerProfile.deleteMany({ where: { userId } }).catch(() => {});
    await client.user.deleteMany({ where: { id: userId } }).catch(() => {});
  }
  await client.$disconnect();
}
