import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { DatabaseService } from '../database/database.service.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  ApplicationStatus,
  InterviewStatus,
  JobStatus,
  NotificationType,
  UserRole,
} from '../generated/prisma/enums.js';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let mockDb: {
    client: {
      studentProfile: {
        findUnique: ReturnType<typeof vi.fn>;
      };
      employerProfile: {
        findUnique: ReturnType<typeof vi.fn>;
      };
      job: {
        findUnique: ReturnType<typeof vi.fn>;
      };
      application: {
        findUnique: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
      };
      $transaction: ReturnType<typeof vi.fn>;
    };
  };

  const mockStudentUser = { id: 'user-student-1' };
  const mockStudentProfile = {
    id: 'student-profile-1',
    userId: mockStudentUser.id,
    fullName: 'Jane Doe',
  };

  const mockCompany = {
    id: 'company-1',
    name: 'Tech Corp',
    employers: [{ userId: 'employer-user-1' }, { userId: 'employer-user-2' }],
  };

  const mockEmployerUser = { id: 'employer-user-1' };
  const mockEmployerProfile = {
    id: 'employer-profile-1',
    userId: mockEmployerUser.id,
    companyId: mockCompany.id,
    company: mockCompany,
  };

  const mockPublishedJob = {
    id: 'job-1',
    title: 'Fullstack Engineer',
    companyId: mockCompany.id,
    status: JobStatus.PUBLISHED,
    company: mockCompany,
  };

  beforeEach(() => {
    mockDb = {
      client: {
        studentProfile: {
          findUnique: vi.fn(),
        },
        employerProfile: {
          findUnique: vi.fn(),
        },
        job: {
          findUnique: vi.fn(),
        },
        application: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
        },
        $transaction: vi.fn(),
      },
    };

    service = new ApplicationsService(mockDb as unknown as DatabaseService);
  });

  describe('applyForJob', () => {
    it('throws NotFoundException if student profile does not exist', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.applyForJob(mockStudentUser.id, 'job-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if job does not exist', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.job.findUnique.mockResolvedValue(null);

      await expect(
        service.applyForJob(mockStudentUser.id, 'job-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if job is not PUBLISHED', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.job.findUnique.mockResolvedValue({
        ...mockPublishedJob,
        status: JobStatus.DRAFT,
      });

      await expect(
        service.applyForJob(mockStudentUser.id, 'job-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if student has already applied for this job', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.job.findUnique.mockResolvedValue(mockPublishedJob);
      mockDb.client.application.findUnique.mockResolvedValue({ id: 'existing-app' });

      await expect(
        service.applyForJob(mockStudentUser.id, 'job-1', {}),
      ).rejects.toThrow(ConflictException);
    });

    it('handles concurrent P2002 conflict and throws ConflictException', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.job.findUnique.mockResolvedValue(mockPublishedJob);
      mockDb.client.application.findUnique.mockResolvedValue(null);

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint violation',
        { code: 'P2002', clientVersion: '6.0.0' },
      );
      mockDb.client.$transaction.mockRejectedValue(p2002Error);

      await expect(
        service.applyForJob(mockStudentUser.id, 'job-1', {}),
      ).rejects.toThrow(ConflictException);
    });

    it('successfully applies for a job in a transaction with history, notifications, and audit log', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.job.findUnique.mockResolvedValue(mockPublishedJob);
      mockDb.client.application.findUnique.mockResolvedValue(null);

      const mockCreatedApplication = {
        id: 'new-app-1',
        studentId: mockStudentProfile.id,
        jobId: mockPublishedJob.id,
        status: ApplicationStatus.SUBMITTED,
        coverLetter: 'Passionate about coding',
      };

      const mockTx = {
        application: {
          create: vi.fn().mockResolvedValue(mockCreatedApplication),
        },
        applicationStatusHistory: {
          create: vi.fn().mockResolvedValue({ id: 'history-1' }),
        },
        notification: {
          create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        },
      };

      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.applyForJob(mockStudentUser.id, 'job-1', {
        coverLetter: 'Passionate about coding',
      });

      expect(mockTx.application.create).toHaveBeenCalledWith({
        data: {
          studentId: mockStudentProfile.id,
          jobId: 'job-1',
          status: ApplicationStatus.SUBMITTED,
          coverLetter: 'Passionate about coding',
        },
        include: {
          job: {
            include: {
              company: true,
              category: true,
              skills: { include: { skill: true } },
            },
          },
          student: true,
        },
      });

      expect(mockTx.applicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'new-app-1',
          fromStatus: null,
          toStatus: ApplicationStatus.SUBMITTED,
          changedById: mockStudentUser.id,
          reason: 'Candidate submitted initial application.',
        },
      });

      expect(mockTx.notification.create).toHaveBeenCalledTimes(2);
      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'employer-user-1',
          type: NotificationType.NEW_APPLICATION,
          title: 'New Application Received',
          body: `${mockStudentProfile.fullName} submitted an application for ${mockPublishedJob.title}.`,
          data: {
            jobId: mockPublishedJob.id,
            applicationId: 'new-app-1',
            studentId: mockStudentProfile.id,
            applicantName: mockStudentProfile.fullName,
          },
        },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockStudentUser.id,
          action: 'APPLICATION_SUBMITTED',
          entity: 'Application',
          entityId: 'new-app-1',
          metadata: {
            jobId: mockPublishedJob.id,
            jobTitle: mockPublishedJob.title,
          },
        },
      });

      expect(result).toBe(mockCreatedApplication);
    });
  });

  describe('withdrawApplication', () => {
    it('throws NotFoundException if student profile does not exist', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.withdrawApplication(mockStudentUser.id, 'app-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if application does not exist', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.application.findUnique.mockResolvedValue(null);

      await expect(
        service.withdrawApplication(mockStudentUser.id, 'app-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if application belongs to another student', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        studentId: 'other-student-profile-id',
      });

      await expect(
        service.withdrawApplication(mockStudentUser.id, 'app-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if application has active interview', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        studentId: mockStudentProfile.id,
        status: ApplicationStatus.INTERVIEW,
        job: { company: mockCompany },
      });

      await expect(
        service.withdrawApplication(mockStudentUser.id, 'app-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if application is already in terminal state', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        studentId: mockStudentProfile.id,
        status: ApplicationStatus.REJECTED,
        job: { company: mockCompany },
      });

      await expect(
        service.withdrawApplication(mockStudentUser.id, 'app-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if conditional update count is 0 (race condition)', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        studentId: mockStudentProfile.id,
        status: ApplicationStatus.SUBMITTED,
        job: { title: 'Engineer', company: mockCompany },
      });

      const mockTx = {
        application: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };

      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        service.withdrawApplication(mockStudentUser.id, 'app-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully withdraws application, creates history, notifies employer, and logs audit', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      const mockApplication = {
        id: 'app-1',
        studentId: mockStudentProfile.id,
        status: ApplicationStatus.REVIEWING,
        job: { id: 'job-1', title: 'Engineer', company: mockCompany },
      };
      mockDb.client.application.findUnique.mockResolvedValue(mockApplication);

      const mockWithdrawnApplication = {
        ...mockApplication,
        status: ApplicationStatus.WITHDRAWN,
      };

      const mockTx = {
        application: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(mockWithdrawnApplication),
        },
        applicationStatusHistory: {
          create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
        },
        notification: {
          create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        },
      };

      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.withdrawApplication(mockStudentUser.id, 'app-1', {
        reason: 'Found alternative offer',
      });

      expect(mockTx.application.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'app-1',
          studentId: mockStudentProfile.id,
          status: {
            in: [
              ApplicationStatus.SUBMITTED,
              ApplicationStatus.REVIEWING,
              ApplicationStatus.SHORTLISTED,
            ],
          },
        },
        data: {
          status: ApplicationStatus.WITHDRAWN,
          updatedAt: expect.any(Date),
        },
      });

      expect(mockTx.applicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-1',
          fromStatus: ApplicationStatus.REVIEWING,
          toStatus: ApplicationStatus.WITHDRAWN,
          reason: 'Found alternative offer',
          changedById: mockStudentUser.id,
        },
      });

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'employer-user-1',
          type: NotificationType.APPLICATION_WITHDRAWN,
          title: 'Application Withdrawn',
          body: `${mockStudentProfile.fullName} has withdrawn their application for ${mockApplication.job.title}.`,
          data: {
            jobId: mockApplication.job.id,
            applicationId: 'app-1',
          },
        },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockStudentUser.id,
          action: 'APPLICATION_WITHDRAWN',
          entity: 'Application',
          entityId: 'app-1',
          metadata: {
            previousStatus: ApplicationStatus.REVIEWING,
            newStatus: ApplicationStatus.WITHDRAWN,
            reason: 'Found alternative offer',
          },
        },
      });

      expect(result).toBe(mockWithdrawnApplication);
    });
  });

  describe('getMyApplications', () => {
    it('returns paginated applications with metadata', async () => {
      mockDb.client.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
      mockDb.client.application.count.mockResolvedValue(15);
      mockDb.client.application.findMany.mockResolvedValue([
        { id: 'app-1', status: ApplicationStatus.SUBMITTED },
      ]);

      const result = await service.getMyApplications(mockStudentUser.id, {
        page: 2,
        pageSize: 5,
        status: ApplicationStatus.SUBMITTED,
      });

      expect(mockDb.client.application.count).toHaveBeenCalledWith({
        where: {
          studentId: mockStudentProfile.id,
          status: ApplicationStatus.SUBMITTED,
        },
      });

      expect(mockDb.client.application.findMany).toHaveBeenCalledWith({
        where: {
          studentId: mockStudentProfile.id,
          status: ApplicationStatus.SUBMITTED,
        },
        skip: 5,
        take: 5,
        orderBy: { submittedAt: 'desc' },
        include: expect.any(Object),
      });

      expect(result).toEqual({
        data: [{ id: 'app-1', status: ApplicationStatus.SUBMITTED }],
        meta: {
          total: 15,
          page: 2,
          pageSize: 5,
          totalPages: 3,
        },
      });
    });
  });

  describe('getEmployerApplications', () => {
    it('throws NotFoundException if employer profile not found', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getEmployerApplications(mockEmployerUser.id, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if employer has no company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        ...mockEmployerProfile,
        companyId: null,
        company: null,
      });

      await expect(
        service.getEmployerApplications(mockEmployerUser.id, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if filtered jobId does not exist', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.job.findUnique.mockResolvedValue(null);

      await expect(
        service.getEmployerApplications(mockEmployerUser.id, { jobId: 'job-999' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if filtered jobId does not belong to employer company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.job.findUnique.mockResolvedValue({
        id: 'job-other',
        companyId: 'other-company',
      });

      await expect(
        service.getEmployerApplications(mockEmployerUser.id, { jobId: 'job-other' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns paginated applications with search filter', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.count.mockResolvedValue(1);
      mockDb.client.application.findMany.mockResolvedValue([
        { id: 'app-1', status: ApplicationStatus.SUBMITTED },
      ]);

      const result = await service.getEmployerApplications(mockEmployerUser.id, {
        page: 1,
        pageSize: 10,
        search: 'Jane',
        status: ApplicationStatus.SUBMITTED,
      });

      expect(mockDb.client.application.count).toHaveBeenCalledWith({
        where: {
          job: { companyId: mockCompany.id },
          status: ApplicationStatus.SUBMITTED,
          student: {
            OR: [
              { fullName: { contains: 'Jane', mode: 'insensitive' } },
              { user: { email: { contains: 'Jane', mode: 'insensitive' } } },
            ],
          },
        },
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('allows ADMIN to query applications across all companies', async () => {
      mockDb.client.application.count.mockResolvedValue(5);
      mockDb.client.application.findMany.mockResolvedValue([
        { id: 'app-1', status: ApplicationStatus.SUBMITTED },
      ]);

      const result = await service.getEmployerApplications(
        'admin-user',
        { page: 1, pageSize: 10 },
        UserRole.ADMIN,
      );

      expect(mockDb.client.employerProfile.findUnique).not.toHaveBeenCalled();
      expect(result.meta.total).toBe(5);
    });
  });

  describe('getJobApplications', () => {
    it('delegates to getEmployerApplications with combined query', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.job.findUnique.mockResolvedValue({ companyId: mockCompany.id });
      mockDb.client.application.count.mockResolvedValue(1);
      mockDb.client.application.findMany.mockResolvedValue([
        { id: 'app-1', status: ApplicationStatus.SUBMITTED },
      ]);

      const result = await service.getJobApplications(mockEmployerUser.id, 'job-1', {
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('reviewApplication', () => {
    it('throws NotFoundException if application not found', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewApplication(mockEmployerUser.id, 'app-not-found'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if application belongs to another company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        job: { companyId: 'other-comp' },
      });

      await expect(
        service.reviewApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns application without changes if already in REVIEWING status (idempotent)', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      const reviewingApp = {
        id: 'app-1',
        status: ApplicationStatus.REVIEWING,
        job: { companyId: mockCompany.id },
      };
      mockDb.client.application.findUnique.mockResolvedValue(reviewingApp);

      const result = await service.reviewApplication(mockEmployerUser.id, 'app-1');

      expect(result).toBe(reviewingApp);
      expect(mockDb.client.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if transition is invalid (e.g. from REJECTED)', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.REJECTED,
        job: { companyId: mockCompany.id },
      });

      await expect(
        service.reviewApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if conditional update count is 0', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.SUBMITTED,
        job: { companyId: mockCompany.id },
      });

      const mockTx = {
        application: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        service.reviewApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully transitions from SUBMITTED to REVIEWING with history and audit log', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      const app = {
        id: 'app-1',
        status: ApplicationStatus.SUBMITTED,
        job: { companyId: mockCompany.id },
      };
      mockDb.client.application.findUnique.mockResolvedValue(app);

      const reviewedApp = {
        ...app,
        status: ApplicationStatus.REVIEWING,
      };

      const mockTx = {
        application: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(reviewedApp),
        },
        applicationStatusHistory: {
          create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        },
      };

      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.reviewApplication(mockEmployerUser.id, 'app-1', {
        note: 'Reviewing candidate portfolio',
      });

      expect(mockTx.application.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'app-1',
          status: ApplicationStatus.SUBMITTED,
        },
        data: {
          status: ApplicationStatus.REVIEWING,
          updatedAt: expect.any(Date),
        },
      });

      expect(mockTx.applicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-1',
          fromStatus: ApplicationStatus.SUBMITTED,
          toStatus: ApplicationStatus.REVIEWING,
          reason: 'Reviewing candidate portfolio',
          changedById: mockEmployerUser.id,
        },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockEmployerUser.id,
          action: 'APPLICATION_REVIEWED',
          entity: 'Application',
          entityId: 'app-1',
          metadata: {
            previousStatus: ApplicationStatus.SUBMITTED,
            newStatus: ApplicationStatus.REVIEWING,
            note: 'Reviewing candidate portfolio',
          },
        },
      });

      expect(result).toBe(reviewedApp);
    });
  });

  describe('shortlistApplication', () => {
    it('throws NotFoundException if application not found', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(null);

      await expect(
        service.shortlistApplication(mockEmployerUser.id, 'app-not-found'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if application belongs to another company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        job: { companyId: 'other-comp' },
      });

      await expect(
        service.shortlistApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if transition is invalid (e.g. from WITHDRAWN)', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.WITHDRAWN,
        job: { companyId: mockCompany.id },
      });

      await expect(
        service.shortlistApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if conditional update count is 0', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.REVIEWING,
        job: { companyId: mockCompany.id },
      });

      const mockTx = {
        application: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        service.shortlistApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully shortlists candidate with notification, history, and audit log', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      const app = {
        id: 'app-1',
        status: ApplicationStatus.REVIEWING,
        job: {
          id: 'job-1',
          title: 'Fullstack Engineer',
          companyId: mockCompany.id,
          company: mockCompany,
        },
        student: {
          id: 'student-1',
          userId: 'student-user-1',
        },
      };
      mockDb.client.application.findUnique.mockResolvedValue(app);

      const shortlistedApp = {
        ...app,
        status: ApplicationStatus.SHORTLISTED,
      };

      const mockTx = {
        application: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(shortlistedApp),
        },
        applicationStatusHistory: {
          create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
        },
        notification: {
          create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        },
      };

      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.shortlistApplication(mockEmployerUser.id, 'app-1', {
        note: 'Impressive interview task solution',
      });

      expect(mockTx.application.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'app-1',
          status: {
            in: [ApplicationStatus.SUBMITTED, ApplicationStatus.REVIEWING],
          },
        },
        data: {
          status: ApplicationStatus.SHORTLISTED,
          updatedAt: expect.any(Date),
        },
      });

      expect(mockTx.applicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-1',
          fromStatus: ApplicationStatus.REVIEWING,
          toStatus: ApplicationStatus.SHORTLISTED,
          reason: 'Impressive interview task solution',
          changedById: mockEmployerUser.id,
        },
      });

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'student-user-1',
          type: NotificationType.APPLICATION_SHORTLISTED,
          title: 'Application Shortlisted',
          body: `${mockCompany.name} has shortlisted your application for ${app.job.title}.`,
          data: {
            jobId: 'job-1',
            applicationId: 'app-1',
          },
        },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockEmployerUser.id,
          action: 'APPLICATION_SHORTLISTED',
          entity: 'Application',
          entityId: 'app-1',
          metadata: {
            previousStatus: ApplicationStatus.REVIEWING,
            newStatus: ApplicationStatus.SHORTLISTED,
            reason: 'Impressive interview task solution',
          },
        },
      });

      expect(result).toBe(shortlistedApp);
    });
  });

  describe('getApplicationById', () => {
    it('throws NotFoundException if application not found', async () => {
      mockDb.client.application.findUnique.mockResolvedValue(null);

      await expect(
        service.getApplicationById(mockStudentUser.id, 'app-not-found', UserRole.STUDENT),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows student owner to view their application', async () => {
      const mockApp = {
        id: 'app-1',
        student: { userId: mockStudentUser.id },
        job: { company: mockCompany },
      };
      mockDb.client.application.findUnique.mockResolvedValue(mockApp);

      const result = await service.getApplicationById(
        mockStudentUser.id,
        'app-1',
        UserRole.STUDENT,
      );

      expect(result).toBe(mockApp);
    });

    it('throws ForbiddenException when student tries to view another student application', async () => {
      const mockApp = {
        id: 'app-1',
        student: { userId: 'other-user' },
        job: { company: mockCompany },
      };
      mockDb.client.application.findUnique.mockResolvedValue(mockApp);

      await expect(
        service.getApplicationById(mockStudentUser.id, 'app-1', UserRole.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows employer owner of the job to view application', async () => {
      const mockApp = {
        id: 'app-1',
        student: { userId: 'student-user-1' },
        job: {
          company: {
            employers: [{ userId: 'employer-user-1' }],
          },
        },
      };
      mockDb.client.application.findUnique.mockResolvedValue(mockApp);

      const result = await service.getApplicationById(
        'employer-user-1',
        'app-1',
        UserRole.EMPLOYER,
      );

      expect(result).toBe(mockApp);
    });

    it('throws ForbiddenException when employer from another company tries to view application', async () => {
      const mockApp = {
        id: 'app-1',
        student: { userId: 'student-user-1' },
        job: {
          company: {
            employers: [{ userId: 'employer-user-1' }],
          },
        },
      };
      mockDb.client.application.findUnique.mockResolvedValue(mockApp);

      await expect(
        service.getApplicationById('other-employer-user', 'app-1', UserRole.EMPLOYER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN to view any application', async () => {
      const mockApp = {
        id: 'app-1',
        student: { userId: 'student-user-1' },
        job: { company: mockCompany },
      };
      mockDb.client.application.findUnique.mockResolvedValue(mockApp);

      const result = await service.getApplicationById('admin-user-1', 'app-1', UserRole.ADMIN);

      expect(result).toBe(mockApp);
    });
  });

  describe('acceptApplication', () => {
    const mockInterviewingApp = {
      id: 'app-1',
      status: ApplicationStatus.INTERVIEW,
      job: {
        id: 'job-1',
        title: 'Backend Engineer',
        companyId: mockCompany.id,
        company: mockCompany,
      },
      student: {
        id: 'student-1',
        userId: 'student-user-1',
      },
    };

    it('throws NotFoundException if application not found', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptApplication(mockEmployerUser.id, 'app-not-found'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if employer from another company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        ...mockInterviewingApp,
        job: { ...mockInterviewingApp.job, companyId: 'other-comp' },
      });

      await expect(
        service.acceptApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException (APPLICATION_TERMINAL_STATE) if already in terminal state', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        ...mockInterviewingApp,
        status: ApplicationStatus.ACCEPTED,
      });

      await expect(
        service.acceptApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException (INVALID_STATE_TRANSITION) if application is not in INTERVIEW stage', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        ...mockInterviewingApp,
        status: ApplicationStatus.SHORTLISTED,
      });

      await expect(
        service.acceptApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if conditional update count is 0', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(mockInterviewingApp);

      const mockTx = {
        application: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        service.acceptApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully accepts candidate, completes pending interviews, notifies student, and logs audit', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(mockInterviewingApp);

      const acceptedApp = {
        ...mockInterviewingApp,
        status: ApplicationStatus.ACCEPTED,
      };

      const mockTx = {
        application: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(acceptedApp),
        },
        interview: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        applicationStatusHistory: {
          create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
        },
        notification: {
          create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        },
      };

      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.acceptApplication(mockEmployerUser.id, 'app-1', {
        note: 'Welcome to the team!',
      });

      expect(mockTx.application.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'app-1',
          status: ApplicationStatus.INTERVIEW,
        },
        data: {
          status: ApplicationStatus.ACCEPTED,
          updatedAt: expect.any(Date),
        },
      });

      expect(mockTx.interview.updateMany).toHaveBeenCalledWith({
        where: {
          applicationId: 'app-1',
          status: { in: [InterviewStatus.PROPOSED, InterviewStatus.ACCEPTED] },
        },
        data: {
          status: InterviewStatus.COMPLETED,
          updatedAt: expect.any(Date),
        },
      });

      expect(mockTx.applicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-1',
          fromStatus: ApplicationStatus.INTERVIEW,
          toStatus: ApplicationStatus.ACCEPTED,
          reason: 'Welcome to the team!',
          changedById: mockEmployerUser.id,
        },
      });

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'student-user-1',
          type: NotificationType.APPLICATION_ACCEPTED,
          title: 'Congratulations! Application Accepted',
          body: `${mockCompany.name} has accepted your application for ${mockInterviewingApp.job.title}.`,
          data: {
            jobId: 'job-1',
            applicationId: 'app-1',
          },
        },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockEmployerUser.id,
          action: 'APPLICATION_ACCEPTED',
          entity: 'Application',
          entityId: 'app-1',
          metadata: {
            previousStatus: ApplicationStatus.INTERVIEW,
            newStatus: ApplicationStatus.ACCEPTED,
            note: 'Welcome to the team!',
          },
        },
      });

      expect(result).toBe(acceptedApp);
    });
  });

  describe('rejectApplication', () => {
    const mockApp = {
      id: 'app-1',
      status: ApplicationStatus.SHORTLISTED,
      job: {
        id: 'job-1',
        title: 'Backend Engineer',
        companyId: mockCompany.id,
        company: mockCompany,
      },
      student: {
        id: 'student-1',
        userId: 'student-user-1',
      },
    };

    it('throws NotFoundException if application not found', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectApplication(mockEmployerUser.id, 'app-not-found'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if employer from another company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        ...mockApp,
        job: { ...mockApp.job, companyId: 'other-comp' },
      });

      await expect(
        service.rejectApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException (APPLICATION_TERMINAL_STATE) if already in terminal state', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        ...mockApp,
        status: ApplicationStatus.REJECTED,
      });

      await expect(
        service.rejectApplication(mockEmployerUser.id, 'app-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully rejects candidate, cancels pending interviews, notifies student, and logs audit', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(mockApp);

      const rejectedApp = {
        ...mockApp,
        status: ApplicationStatus.REJECTED,
      };

      const mockTx = {
        application: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(rejectedApp),
        },
        interview: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        applicationStatusHistory: {
          create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
        },
        notification: {
          create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        },
      };

      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.rejectApplication(mockEmployerUser.id, 'app-1', {
        reason: 'Selected candidate with higher cloud experience.',
      });

      expect(mockTx.application.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'app-1',
          status: {
            in: [
              ApplicationStatus.SUBMITTED,
              ApplicationStatus.REVIEWING,
              ApplicationStatus.SHORTLISTED,
              ApplicationStatus.INTERVIEW,
            ],
          },
        },
        data: {
          status: ApplicationStatus.REJECTED,
          updatedAt: expect.any(Date),
        },
      });

      expect(mockTx.interview.updateMany).toHaveBeenCalledWith({
        where: {
          applicationId: 'app-1',
          status: { in: [InterviewStatus.PROPOSED, InterviewStatus.ACCEPTED] },
        },
        data: {
          status: InterviewStatus.CANCELLED,
          notes: 'Cancelled due to candidate application rejection.',
          updatedAt: expect.any(Date),
        },
      });

      expect(mockTx.applicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-1',
          fromStatus: ApplicationStatus.SHORTLISTED,
          toStatus: ApplicationStatus.REJECTED,
          reason: 'Selected candidate with higher cloud experience.',
          changedById: mockEmployerUser.id,
        },
      });

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'student-user-1',
          type: NotificationType.APPLICATION_REJECTED,
          title: 'Application Update',
          body: `Your application for ${mockApp.job.title} at ${mockCompany.name} was not selected.`,
          data: {
            jobId: 'job-1',
            applicationId: 'app-1',
          },
        },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockEmployerUser.id,
          action: 'APPLICATION_REJECTED',
          entity: 'Application',
          entityId: 'app-1',
          metadata: {
            previousStatus: ApplicationStatus.SHORTLISTED,
            newStatus: ApplicationStatus.REJECTED,
            reason: 'Selected candidate with higher cloud experience.',
          },
        },
      });

      expect(result).toBe(rejectedApp);
    });
  });

  describe('updateHiringOutcome', () => {
    it('calls acceptApplication when outcome is ACCEPTED', async () => {
      const spy = vi.spyOn(service, 'acceptApplication').mockResolvedValue({ id: 'app-1' } as any);

      await service.updateHiringOutcome(mockEmployerUser.id, 'app-1', {
        outcome: 'ACCEPTED',
        note: 'Offer accepted',
      });

      expect(spy).toHaveBeenCalledWith(
        mockEmployerUser.id,
        'app-1',
        { note: 'Offer accepted' },
        UserRole.EMPLOYER,
      );
    });

    it('calls rejectApplication when outcome is REJECTED', async () => {
      const spy = vi.spyOn(service, 'rejectApplication').mockResolvedValue({ id: 'app-1' } as any);

      await service.updateHiringOutcome(mockEmployerUser.id, 'app-1', {
        outcome: 'REJECTED',
        reason: 'Not selected',
      });

      expect(spy).toHaveBeenCalledWith(
        mockEmployerUser.id,
        'app-1',
        { reason: 'Not selected' },
        UserRole.EMPLOYER,
      );
    });
  });
});
