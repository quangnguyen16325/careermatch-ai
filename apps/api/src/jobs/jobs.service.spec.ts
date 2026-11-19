import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { DatabaseService } from '../database/database.service.js';
import {
  JobStatus,
  NotificationType,
  VerificationStatus,
} from '../generated/prisma/enums.js';

describe('JobsService', () => {
  let service: JobsService;
  let mockDb: {
    client: {
      employerProfile: {
        findUnique: ReturnType<typeof vi.fn>;
      };
      studentProfile: {
        findUnique: ReturnType<typeof vi.fn>;
      };
      company: {
        findUnique: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
      };
      careerCategory: {
        findUnique: ReturnType<typeof vi.fn>;
      };
      skill: {
        findMany: ReturnType<typeof vi.fn>;
      };
      job: {
        findUnique: ReturnType<typeof vi.fn>;
        findUniqueOrThrow: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        updateMany: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        deleteMany: ReturnType<typeof vi.fn>;
      };
      jobSkill: {
        deleteMany: ReturnType<typeof vi.fn>;
        createMany: ReturnType<typeof vi.fn>;
      };
      savedJob: {
        findUnique: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
      };
      auditLog: {
        create: ReturnType<typeof vi.fn>;
      };
      user: {
        findMany: ReturnType<typeof vi.fn>;
      };
      notification: {
        create: ReturnType<typeof vi.fn>;
      };
      $transaction: ReturnType<typeof vi.fn>;
    };
  };

  const mockEmployerWithCompany = {
    id: 'emp-1',
    userId: 'user-1',
    companyId: 'comp-1',
    company: {
      id: 'comp-1',
      name: 'TechCorp',
      verificationStatus: VerificationStatus.VERIFIED,
    },
  };

  beforeEach(() => {
    mockDb = {
      client: {
        employerProfile: {
          findUnique: vi.fn(),
        },
        studentProfile: {
          findUnique: vi.fn(),
        },
        company: {
          findUnique: vi.fn(),
          findFirst: vi.fn().mockResolvedValue({
            id: 'comp-1',
            verificationStatus: VerificationStatus.VERIFIED,
          }),
        },
        careerCategory: {
          findUnique: vi.fn(),
        },
        skill: {
          findMany: vi.fn(),
        },
        job: {
          findUnique: vi.fn(),
          findUniqueOrThrow: vi.fn(),
          findFirst: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          delete: vi.fn(),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        jobSkill: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        savedJob: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
          create: vi.fn(),
          delete: vi.fn(),
        },
        auditLog: {
          create: vi.fn(),
        },
        user: {
          findMany: vi.fn(),
        },
        notification: {
          create: vi.fn(),
        },
        $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
          cb(mockDb.client),
        ),
      },
    };

    service = new JobsService(mockDb as unknown as DatabaseService);
  });

  describe('createDraft', () => {
    it('throws NotFoundException if employer profile does not exist', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createDraft('user-1', {
          title: 'Backend Dev',
          description: 'A great NestJS role',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if employer has no linked company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        id: 'emp-1',
        userId: 'user-1',
        companyId: null,
        company: null,
      });

      await expect(
        service.createDraft('user-1', {
          title: 'Backend Dev',
          description: 'A great NestJS role',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if specified category does not exist', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.careerCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.createDraft('user-1', {
          title: 'Backend Dev',
          description: 'A great NestJS role',
          categoryId: 'cat-invalid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if any specified skill does not exist', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.skill.findMany.mockResolvedValue([{ id: 'skill-1' }]);

      await expect(
        service.createDraft('user-1', {
          title: 'Backend Dev',
          description: 'A great NestJS role',
          skills: [{ skillId: 'skill-1' }, { skillId: 'skill-2' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a job draft, links skills and records audit log', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.skill.findMany.mockResolvedValue([{ id: 'skill-1' }]);

      const createdJob = {
        id: 'job-1',
        title: 'Backend Dev',
        description: 'A great NestJS role',
        companyId: 'comp-1',
        status: JobStatus.DRAFT,
      };
      mockDb.client.job.create.mockResolvedValue(createdJob);

      const result = await service.createDraft('user-1', {
        title: 'Backend Dev',
        description: 'A great NestJS role',
        skills: [{ skillId: 'skill-1', required: true, weight: 1 }],
      });

      expect(result).toEqual(createdJob);
      expect(mockDb.client.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'comp-1',
            status: JobStatus.DRAFT,
          }),
        }),
      );
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: 'JOB_CREATED',
          entity: 'Job',
          entityId: 'job-1',
        }),
      });
    });
  });

  describe('getMyJobs', () => {
    it('returns paginated jobs for employer company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.count.mockResolvedValue(1);
      mockDb.client.job.findMany.mockResolvedValue([
        { id: 'job-1', title: 'Backend' },
      ]);

      const result = await service.getMyJobs('user-1', {
        page: 1,
        pageSize: 10,
        status: JobStatus.DRAFT,
        search: 'Backend',
      });

      expect(result.meta.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(mockDb.client.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'comp-1',
            status: JobStatus.DRAFT,
          }),
        }),
      );
    });
  });

  describe('getJobById', () => {
    it('throws NotFoundException if job does not exist', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue(null);

      await expect(service.getJobById('user-1', 'job-unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if job belongs to another company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        companyId: 'comp-other',
      });

      await expect(service.getJobById('user-1', 'job-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns job details when owned by employer company', async () => {
      const job = { id: 'job-1', companyId: 'comp-1', title: 'Backend' };
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue(job);

      const result = await service.getJobById('user-1', 'job-1');
      expect(result).toEqual(job);
    });
  });

  describe('updateJob', () => {
    it('throws BadRequestException if job is not in DRAFT or REJECTED status', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        companyId: 'comp-1',
        status: JobStatus.PENDING_APPROVAL,
      });

      await expect(
        service.updateJob('user-1', 'job-1', { title: 'Updated' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates job fields and replaces skills when in DRAFT status', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        companyId: 'comp-1',
        status: JobStatus.DRAFT,
      });
      mockDb.client.skill.findMany.mockResolvedValue([{ id: 'skill-1' }]);
      mockDb.client.job.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        title: 'New Title',
      });

      const result = await service.updateJob('user-1', 'job-1', {
        title: 'New Title',
        skills: [{ skillId: 'skill-1', required: true, weight: 2 }],
      });

      expect(result.title).toBe('New Title');
      expect(mockDb.client.jobSkill.deleteMany).toHaveBeenCalledWith({
        where: { jobId: 'job-1' },
      });
      expect(mockDb.client.jobSkill.createMany).toHaveBeenCalledWith({
        data: [{ jobId: 'job-1', skillId: 'skill-1', required: true, weight: 2 }],
      });
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'JOB_UPDATED',
          entityId: 'job-1',
        }),
      });
    });

    it('throws BadRequestException if job status changed concurrently before update completes', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        companyId: 'comp-1',
        status: JobStatus.DRAFT,
      });
      // Simulate race condition where job became PUBLISHED between read and write
      mockDb.client.job.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateJob('user-1', 'job-1', { title: 'New Title' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitForApproval', () => {
    it('throws ForbiddenException if company is not VERIFIED', async () => {
      const employerUnverified = {
        ...mockEmployerWithCompany,
        company: {
          id: 'comp-1',
          name: 'TechCorp',
          verificationStatus: VerificationStatus.PENDING,
        },
      };
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        employerUnverified,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        title: 'Backend',
        companyId: 'comp-1',
        status: JobStatus.DRAFT,
      });

      await expect(
        service.submitForApproval('user-1', 'job-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if transition from current status is invalid', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        title: 'Backend',
        companyId: 'comp-1',
        status: JobStatus.CLOSED,
      });

      await expect(
        service.submitForApproval('user-1', 'job-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('submits job, updates status, and notifies active admins', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        title: 'Senior Backend Engineer',
        companyId: 'comp-1',
        status: JobStatus.DRAFT,
      });
      mockDb.client.job.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: JobStatus.PENDING_APPROVAL,
      });
      mockDb.client.user.findMany.mockResolvedValue([
        { id: 'admin-1' },
        { id: 'admin-2' },
      ]);

      const result = await service.submitForApproval('user-1', 'job-1');

      expect(result.status).toBe(JobStatus.PENDING_APPROVAL);
      expect(mockDb.client.notification.create).toHaveBeenCalledTimes(2);
      expect(mockDb.client.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-1',
          type: NotificationType.JOB_APPROVAL_REQUIRED,
        }),
      });
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'JOB_SUBMITTED_FOR_APPROVAL',
          entityId: 'job-1',
        }),
      });
    });
  });

  describe('withdrawToDraft', () => {
    it('withdraws pending job back to draft', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        companyId: 'comp-1',
        status: JobStatus.PENDING_APPROVAL,
      });
      mockDb.client.job.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: JobStatus.DRAFT,
      });

      const result = await service.withdrawToDraft('user-1', 'job-1');

      expect(result.status).toBe(JobStatus.DRAFT);
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'JOB_WITHDRAWN_TO_DRAFT',
          entityId: 'job-1',
        }),
      });
    });
  });

  describe('closeJob', () => {
    it('closes a published job', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        companyId: 'comp-1',
        status: JobStatus.PUBLISHED,
      });
      mockDb.client.job.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: JobStatus.CLOSED,
      });

      const result = await service.closeJob('user-1', 'job-1');

      expect(result.status).toBe(JobStatus.CLOSED);
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'JOB_CLOSED',
          entityId: 'job-1',
        }),
      });
    });
  });

  describe('deleteDraft', () => {
    it('throws BadRequestException if job is not in DRAFT status', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        companyId: 'comp-1',
        status: JobStatus.PENDING_APPROVAL,
      });

      await expect(service.deleteDraft('user-1', 'job-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deletes draft job and logs audit', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(
        mockEmployerWithCompany,
      );
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        companyId: 'comp-1',
        status: JobStatus.DRAFT,
      });

      const result = await service.deleteDraft('user-1', 'job-1');

      expect(result.success).toBe(true);
      expect(mockDb.client.job.deleteMany).toHaveBeenCalledWith({
        where: { id: 'job-1', companyId: 'comp-1', status: JobStatus.DRAFT },
      });
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'JOB_DELETED',
          entityId: 'job-1',
        }),
      });
    });
  });

  describe('adminFindAll', () => {
    it('paginates and filters jobs for admin review', async () => {
      mockDb.client.job.count.mockResolvedValue(1);
      mockDb.client.job.findMany.mockResolvedValue([
        { id: 'job-1', title: 'Tech Lead', status: JobStatus.PENDING_APPROVAL },
      ]);

      const result = await service.adminFindAll({
        page: 1,
        pageSize: 10,
        status: JobStatus.PENDING_APPROVAL,
        search: 'Tech',
      });

      expect(result.meta.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(mockDb.client.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: JobStatus.PENDING_APPROVAL,
          }),
        }),
      );
    });
  });

  describe('adminModerate', () => {
    it('throws NotFoundException if job does not exist', async () => {
      mockDb.client.job.findUnique.mockResolvedValue(null);

      await expect(
        service.adminModerate('admin-1', 'job-unknown', {
          status: JobStatus.PUBLISHED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if rejecting without reason of >= 10 chars', async () => {
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        status: JobStatus.PENDING_APPROVAL,
        company: { employers: [{ userId: 'emp-1' }] },
      });

      await expect(
        service.adminModerate('admin-1', 'job-1', {
          status: JobStatus.REJECTED,
          reason: 'bad job',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if transition is invalid', async () => {
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        status: JobStatus.DRAFT,
        company: { employers: [{ userId: 'emp-1' }] },
      });

      // Admin cannot transition directly from DRAFT to PUBLISHED
      await expect(
        service.adminModerate('admin-1', 'job-1', {
          status: JobStatus.PUBLISHED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('approves job: publishes and notifies employers', async () => {
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        title: 'Backend Engineer',
        status: JobStatus.PENDING_APPROVAL,
        companyId: 'comp-1',
        company: { employers: [{ userId: 'emp-user-1' }] },
      });
      mockDb.client.job.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: JobStatus.PUBLISHED,
        publishedAt: new Date(),
      });

      const result = await service.adminModerate('admin-1', 'job-1', {
        status: JobStatus.PUBLISHED,
      });

      expect(result.status).toBe(JobStatus.PUBLISHED);
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'JOB_APPROVED',
          entity: 'Job',
          entityId: 'job-1',
        }),
      });
      expect(mockDb.client.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'emp-user-1',
          type: NotificationType.JOB_APPROVED,
        }),
      });
    });

    it('rejects job with reason and notifies employers', async () => {
      const reason = 'Job description is too vague and lacks requirements';
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        title: 'Backend Engineer',
        status: JobStatus.PENDING_APPROVAL,
        companyId: 'comp-1',
        company: { employers: [{ userId: 'emp-user-1' }] },
      });
      mockDb.client.job.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        status: JobStatus.REJECTED,
        publishedAt: null,
      });

      const result = await service.adminModerate('admin-1', 'job-1', {
        status: JobStatus.REJECTED,
        reason,
      });

      expect(result.status).toBe(JobStatus.REJECTED);
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'JOB_REJECTED',
          entity: 'Job',
          entityId: 'job-1',
        }),
      });
      expect(mockDb.client.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'emp-user-1',
          type: NotificationType.JOB_REJECTED,
          body: expect.stringContaining(reason),
        }),
      });
    });

    it('throws BadRequestException if job status changed concurrently during admin moderation', async () => {
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-1',
        title: 'Backend Engineer',
        status: JobStatus.PENDING_APPROVAL,
        companyId: 'comp-1',
        company: { employers: [{ userId: 'emp-user-1' }] },
      });
      // Simulate another admin having approved or rejected the job in parallel
      mockDb.client.job.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.adminModerate('admin-1', 'job-1', {
          status: JobStatus.PUBLISHED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('searchPublicJobs', () => {
    it('queries published jobs with filters and pagination', async () => {
      mockDb.client.job.count.mockResolvedValue(1);
      mockDb.client.job.findMany.mockResolvedValue([
        { id: 'job-1', title: 'NestJS Developer', status: JobStatus.PUBLISHED },
      ]);

      const result = await service.searchPublicJobs({
        page: 1,
        pageSize: 10,
        search: 'NestJS',
        workMode: 'REMOTE',
        location: 'HCM',
        skillIds: ['skill-1'],
      });

      expect(result.meta.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(mockDb.client.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: JobStatus.PUBLISHED,
            workMode: 'REMOTE',
          }),
        }),
      );
    });
  });

  describe('getPublicJobById', () => {
    it('throws NotFoundException if job does not exist or is not PUBLISHED', async () => {
      mockDb.client.job.findFirst.mockResolvedValue(null);

      await expect(service.getPublicJobById('job-unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns published job details', async () => {
      const publicJob = {
        id: 'job-1',
        title: 'Backend Engineer',
        status: JobStatus.PUBLISHED,
      };
      mockDb.client.job.findFirst.mockResolvedValue(publicJob);

      const result = await service.getPublicJobById('job-1');
      expect(result).toEqual(publicJob);
    });
  });

  describe('saved jobs', () => {
    const mockStudent = { id: 'student-1', userId: 'user-student-1' };

    it('throws NotFoundException if student profile does not exist when saving', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(null);

      await expect(service.saveJob('user-student-1', 'job-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if job is not found or not published', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudent);
      mockDb.client.job.findFirst.mockResolvedValue(null);

      await expect(service.saveJob('user-student-1', 'job-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if job is already saved', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudent);
      mockDb.client.job.findFirst.mockResolvedValue({ id: 'job-1', status: JobStatus.PUBLISHED });
      mockDb.client.savedJob.findUnique.mockResolvedValue({
        studentId: 'student-1',
        jobId: 'job-1',
      });

      await expect(service.saveJob('user-student-1', 'job-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('saves a published job successfully', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudent);
      mockDb.client.job.findFirst.mockResolvedValue({ id: 'job-1', status: JobStatus.PUBLISHED });
      mockDb.client.savedJob.findUnique.mockResolvedValue(null);

      const result = await service.saveJob('user-student-1', 'job-1');

      expect(result.success).toBe(true);
      expect(mockDb.client.savedJob.create).toHaveBeenCalledWith({
        data: {
          studentId: 'student-1',
          jobId: 'job-1',
        },
      });
    });

    it('unsaves a saved job successfully', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudent);
      mockDb.client.savedJob.findUnique.mockResolvedValue({
        studentId: 'student-1',
        jobId: 'job-1',
      });

      const result = await service.unsaveJob('user-student-1', 'job-1');

      expect(result.success).toBe(true);
      expect(mockDb.client.savedJob.delete).toHaveBeenCalledWith({
        where: {
          studentId_jobId: {
            studentId: 'student-1',
            jobId: 'job-1',
          },
        },
      });
    });

    it('throws NotFoundException when trying to unsave a non-saved job', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudent);
      mockDb.client.savedJob.findUnique.mockResolvedValue(null);

      await expect(service.unsaveJob('user-student-1', 'job-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns paginated saved jobs for student', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudent);
      mockDb.client.savedJob.count.mockResolvedValue(1);
      mockDb.client.savedJob.findMany.mockResolvedValue([
        {
          createdAt: new Date(),
          job: { id: 'job-1', title: 'React Dev' },
        },
      ]);

      const result = await service.getSavedJobs('user-student-1', {
        page: 1,
        pageSize: 10,
      });

      expect(result.meta.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('job-1');
    });

    it('checks if a job is saved', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudent);
      mockDb.client.savedJob.findUnique.mockResolvedValue({ studentId: 'student-1', jobId: 'job-1' });

      const result = await service.isJobSaved('user-student-1', 'job-1');
      expect(result.isSaved).toBe(true);
    });
  });
});
