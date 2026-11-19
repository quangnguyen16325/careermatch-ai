import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InterviewsService } from './interviews.service.js';
import { DatabaseService } from '../database/database.service.js';
import {
  ApplicationStatus,
  InterviewStatus,
  NotificationType,
  UserRole,
} from '../generated/prisma/enums.js';

describe('InterviewsService', () => {
  let service: InterviewsService;
  let mockDb: {
    client: {
      employerProfile: {
        findUnique: ReturnType<typeof vi.fn>;
      };
      application: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      interview: {
        findUnique: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        updateMany: ReturnType<typeof vi.fn>;
      };
      $transaction: ReturnType<typeof vi.fn>;
    };
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

  const mockStudentUser = { id: 'student-user-1' };
  const mockStudentProfile = {
    id: 'student-profile-1',
    userId: mockStudentUser.id,
    fullName: 'Jane Doe',
    user: { id: mockStudentUser.id, email: 'student@careermatch.local' },
  };

  const mockShortlistedApplication = {
    id: 'app-1',
    status: ApplicationStatus.SHORTLISTED,
    student: mockStudentProfile,
    job: {
      id: 'job-1',
      title: 'Senior Backend Engineer',
      companyId: mockCompany.id,
      company: mockCompany,
    },
  };

  beforeEach(() => {
    mockDb = {
      client: {
        employerProfile: {
          findUnique: vi.fn(),
        },
        application: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        interview: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          create: vi.fn(),
          updateMany: vi.fn(),
        },
        $transaction: vi.fn(),
      },
    };

    service = new InterviewsService(mockDb as unknown as DatabaseService);
  });

  describe('scheduleInterview', () => {
    it('throws NotFoundException if employer profile does not exist', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.scheduleInterview(mockEmployerUser.id, 'app-1', {
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          durationMin: 45,
          meetingUrl: 'https://meet.google.com/abc',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if employer has no company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        ...mockEmployerProfile,
        companyId: null,
        company: null,
      });

      await expect(
        service.scheduleInterview(mockEmployerUser.id, 'app-1', {
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          durationMin: 45,
          meetingUrl: 'https://meet.google.com/abc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if application not found', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(null);

      await expect(
        service.scheduleInterview(mockEmployerUser.id, 'app-999', {
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          durationMin: 45,
          meetingUrl: 'https://meet.google.com/abc',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if application belongs to another company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        ...mockShortlistedApplication,
        job: { ...mockShortlistedApplication.job, companyId: 'other-company' },
      });

      await expect(
        service.scheduleInterview(mockEmployerUser.id, 'app-1', {
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          durationMin: 45,
          meetingUrl: 'https://meet.google.com/abc',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if application is not SHORTLISTED or INTERVIEW', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        ...mockShortlistedApplication,
        status: ApplicationStatus.SUBMITTED,
      });

      await expect(
        service.scheduleInterview(mockEmployerUser.id, 'app-1', {
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          durationMin: 45,
          meetingUrl: 'https://meet.google.com/abc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if scheduledAt is less than 1 hour in future', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(mockShortlistedApplication);

      // 10 minutes in future (less than 1 hour)
      const nearFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await expect(
        service.scheduleInterview(mockEmployerUser.id, 'app-1', {
          scheduledAt: nearFuture,
          durationMin: 45,
          meetingUrl: 'https://meet.google.com/abc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if durationMin is invalid (< 15 or > 180)', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(mockShortlistedApplication);

      const validFuture = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      await expect(
        service.scheduleInterview(mockEmployerUser.id, 'app-1', {
          scheduledAt: validFuture,
          durationMin: 10,
          meetingUrl: 'https://meet.google.com/abc',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.scheduleInterview(mockEmployerUser.id, 'app-1', {
          scheduledAt: validFuture,
          durationMin: 200,
          meetingUrl: 'https://meet.google.com/abc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if neither meetingUrl nor location is provided', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(mockShortlistedApplication);

      const validFuture = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      await expect(
        service.scheduleInterview(mockEmployerUser.id, 'app-1', {
          scheduledAt: validFuture,
          durationMin: 45,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully schedules interview, transitions SHORTLISTED to INTERVIEW, notifies student, and logs audit', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue(mockShortlistedApplication);

      const validFutureDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const mockCreatedInterview = {
        id: 'new-interview-1',
        applicationId: 'app-1',
        scheduledAt: validFutureDate,
        durationMin: 45,
        meetingUrl: 'https://meet.google.com/xyz',
        location: null,
        status: InterviewStatus.PROPOSED,
      };

      const mockTx = {
        interview: {
          create: vi.fn().mockResolvedValue(mockCreatedInterview),
        },
        application: {
          update: vi.fn().mockResolvedValue({ id: 'app-1', status: ApplicationStatus.INTERVIEW }),
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

      const result = await service.scheduleInterview(mockEmployerUser.id, 'app-1', {
        scheduledAt: validFutureDate.toISOString(),
        durationMin: 45,
        meetingUrl: 'https://meet.google.com/xyz',
        notes: 'Technical round 1',
      });

      expect(mockTx.interview.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-1',
          scheduledAt: validFutureDate,
          durationMin: 45,
          meetingUrl: 'https://meet.google.com/xyz',
          location: null,
          notes: 'Technical round 1',
          status: InterviewStatus.PROPOSED,
        },
      });

      expect(mockTx.application.update).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        data: {
          status: ApplicationStatus.INTERVIEW,
          updatedAt: expect.any(Date),
        },
      });

      expect(mockTx.applicationStatusHistory.create).toHaveBeenCalledWith({
        data: {
          applicationId: 'app-1',
          fromStatus: ApplicationStatus.SHORTLISTED,
          toStatus: ApplicationStatus.INTERVIEW,
          reason: 'Interview invitation proposed.',
          changedById: mockEmployerUser.id,
        },
      });

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: {
          userId: mockStudentUser.id,
          type: NotificationType.INTERVIEW_INVITATION,
          title: 'Interview Invitation',
          body: `${mockCompany.name} invited you to an interview for ${mockShortlistedApplication.job.title}.`,
          data: {
            jobId: mockShortlistedApplication.job.id,
            applicationId: 'app-1',
            interviewId: 'new-interview-1',
            scheduledAt: validFutureDate.toISOString(),
          },
        },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockEmployerUser.id,
          action: 'INTERVIEW_PROPOSED',
          entity: 'Interview',
          entityId: 'new-interview-1',
          metadata: {
            applicationId: 'app-1',
            scheduledAt: validFutureDate.toISOString(),
            durationMin: 45,
            hasMeetingUrl: true,
            hasLocation: false,
          },
        },
      });

      expect(result).toBe(mockCreatedInterview);
    });

    it('schedules second interview on application already in INTERVIEW without changing application status', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.application.findUnique.mockResolvedValue({
        ...mockShortlistedApplication,
        status: ApplicationStatus.INTERVIEW,
      });

      const validFutureDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const mockCreatedInterview = {
        id: 'new-interview-2',
        applicationId: 'app-1',
        scheduledAt: validFutureDate,
        durationMin: 60,
        location: 'Office Floor 4',
        status: InterviewStatus.PROPOSED,
      };

      const mockTx = {
        interview: {
          create: vi.fn().mockResolvedValue(mockCreatedInterview),
        },
        application: {
          update: vi.fn(),
        },
        applicationStatusHistory: {
          create: vi.fn(),
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

      const result = await service.scheduleInterview(mockEmployerUser.id, 'app-1', {
        scheduledAt: validFutureDate.toISOString(),
        durationMin: 60,
        location: 'Office Floor 4',
      });

      expect(mockTx.application.update).not.toHaveBeenCalled();
      expect(mockTx.applicationStatusHistory.create).not.toHaveBeenCalled();
      expect(result).toBe(mockCreatedInterview);
    });
  });

  describe('acceptInterview', () => {
    const mockProposedInterview = {
      id: 'int-1',
      status: InterviewStatus.PROPOSED,
      application: {
        id: 'app-1',
        student: mockStudentProfile,
        job: {
          title: 'Senior Backend Engineer',
          company: mockCompany,
        },
      },
    };

    it('throws NotFoundException if interview not found', async () => {
      mockDb.client.interview.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInterview(mockStudentUser.id, 'int-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not the candidate', async () => {
      mockDb.client.interview.findUnique.mockResolvedValue(mockProposedInterview);

      await expect(
        service.acceptInterview('other-student-id', 'int-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if interview is not in PROPOSED status', async () => {
      mockDb.client.interview.findUnique.mockResolvedValue({
        ...mockProposedInterview,
        status: InterviewStatus.ACCEPTED,
      });

      await expect(
        service.acceptInterview(mockStudentUser.id, 'int-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if conditional update returns count 0', async () => {
      mockDb.client.interview.findUnique.mockResolvedValue(mockProposedInterview);

      const mockTx = {
        interview: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        service.acceptInterview(mockStudentUser.id, 'int-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully accepts interview, notifies employers, and logs audit', async () => {
      mockDb.client.interview.findUnique.mockResolvedValue(mockProposedInterview);

      const acceptedInterview = {
        ...mockProposedInterview,
        status: InterviewStatus.ACCEPTED,
      };

      const mockTx = {
        interview: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(acceptedInterview),
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

      const result = await service.acceptInterview(mockStudentUser.id, 'int-1');

      expect(mockTx.interview.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'int-1',
          status: InterviewStatus.PROPOSED,
        },
        data: {
          status: InterviewStatus.ACCEPTED,
          updatedAt: expect.any(Date),
        },
      });

      expect(mockTx.notification.create).toHaveBeenCalledTimes(2);
      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'employer-user-1',
          type: NotificationType.INTERVIEW_CONFIRMED,
          title: 'Interview Confirmed',
          body: `${mockStudentProfile.fullName} confirmed the interview for ${mockProposedInterview.application.job.title}.`,
          data: {
            interviewId: 'int-1',
            applicationId: 'app-1',
          },
        },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockStudentUser.id,
          action: 'INTERVIEW_ACCEPTED',
          entity: 'Interview',
          entityId: 'int-1',
          metadata: {
            previousStatus: InterviewStatus.PROPOSED,
            newStatus: InterviewStatus.ACCEPTED,
          },
        },
      });

      expect(result).toBe(acceptedInterview);
    });
  });

  describe('declineInterview', () => {
    const mockProposedInterview = {
      id: 'int-1',
      status: InterviewStatus.PROPOSED,
      notes: 'Initial notes',
      application: {
        id: 'app-1',
        student: mockStudentProfile,
        job: {
          title: 'Senior Backend Engineer',
          company: mockCompany,
        },
      },
    };

    it('throws NotFoundException if interview not found', async () => {
      mockDb.client.interview.findUnique.mockResolvedValue(null);

      await expect(
        service.declineInterview(mockStudentUser.id, 'int-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not the candidate', async () => {
      mockDb.client.interview.findUnique.mockResolvedValue(mockProposedInterview);

      await expect(
        service.declineInterview('other-student-id', 'int-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if interview is not in PROPOSED status', async () => {
      mockDb.client.interview.findUnique.mockResolvedValue({
        ...mockProposedInterview,
        status: InterviewStatus.DECLINED,
      });

      await expect(
        service.declineInterview(mockStudentUser.id, 'int-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully declines interview with reason and notifies employers', async () => {
      mockDb.client.interview.findUnique.mockResolvedValue(mockProposedInterview);

      const declinedInterview = {
        ...mockProposedInterview,
        status: InterviewStatus.DECLINED,
      };

      const mockTx = {
        interview: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(declinedInterview),
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

      const result = await service.declineInterview(mockStudentUser.id, 'int-1', {
        reason: 'Conflict with university classes',
      });

      expect(mockTx.interview.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'int-1',
          status: InterviewStatus.PROPOSED,
        },
        data: {
          status: InterviewStatus.DECLINED,
          notes: 'Initial notes\n[Declined by candidate]: Conflict with university classes',
          updatedAt: expect.any(Date),
        },
      });

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'employer-user-1',
          type: NotificationType.INTERVIEW_DECLINED,
          title: 'Interview Declined',
          body: `${mockStudentProfile.fullName} declined the interview invitation for ${mockProposedInterview.application.job.title}.`,
          data: {
            interviewId: 'int-1',
            applicationId: 'app-1',
            reason: 'Conflict with university classes',
          },
        },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: mockStudentUser.id,
          action: 'INTERVIEW_DECLINED',
          entity: 'Interview',
          entityId: 'int-1',
          metadata: {
            previousStatus: InterviewStatus.PROPOSED,
            newStatus: InterviewStatus.DECLINED,
            reason: 'Conflict with university classes',
          },
        },
      });

      expect(result).toBe(declinedInterview);
    });
  });

  describe('cancelInterview', () => {
    const mockInterview = {
      id: 'int-1',
      status: InterviewStatus.PROPOSED,
      notes: null,
      application: {
        student: mockStudentProfile,
        job: { companyId: mockCompany.id },
      },
    };

    it('throws NotFoundException if interview not found', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.interview.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelInterview(mockEmployerUser.id, 'int-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if employer from another company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.interview.findUnique.mockResolvedValue({
        ...mockInterview,
        application: { ...mockInterview.application, job: { companyId: 'other-comp' } },
      });

      await expect(
        service.cancelInterview(mockEmployerUser.id, 'int-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if interview is already in COMPLETED or DECLINED status', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.interview.findUnique.mockResolvedValue({
        ...mockInterview,
        status: InterviewStatus.COMPLETED,
      });

      await expect(
        service.cancelInterview(mockEmployerUser.id, 'int-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully cancels interview and logs audit', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(mockEmployerProfile);
      mockDb.client.interview.findUnique.mockResolvedValue(mockInterview);

      const cancelledInterview = {
        ...mockInterview,
        status: InterviewStatus.CANCELLED,
      };

      const mockTx = {
        interview: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(cancelledInterview),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        },
      };

      mockDb.client.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.cancelInterview(mockEmployerUser.id, 'int-1', {
        reason: 'Interviewer emergency',
      });

      expect(mockTx.interview.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'int-1',
          status: { in: [InterviewStatus.PROPOSED, InterviewStatus.ACCEPTED] },
        },
        data: {
          status: InterviewStatus.CANCELLED,
          notes: '[Cancelled by employer]: Interviewer emergency',
          updatedAt: expect.any(Date),
        },
      });

      expect(result).toBe(cancelledInterview);
    });
  });

  describe('getInterviewsByApplication', () => {
    it('throws NotFoundException if application not found', async () => {
      mockDb.client.application.findUnique.mockResolvedValue(null);

      await expect(
        service.getInterviewsByApplication(mockStudentUser.id, 'app-999', UserRole.STUDENT),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows student owner to view interviews', async () => {
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        student: { userId: mockStudentUser.id },
        job: { company: mockCompany },
      });
      mockDb.client.interview.findMany.mockResolvedValue([{ id: 'int-1' }]);

      const result = await service.getInterviewsByApplication(
        mockStudentUser.id,
        'app-1',
        UserRole.STUDENT,
      );

      expect(result).toEqual([{ id: 'int-1' }]);
    });

    it('throws ForbiddenException for student trying to view another application', async () => {
      mockDb.client.application.findUnique.mockResolvedValue({
        id: 'app-1',
        student: { userId: 'other-user' },
        job: { company: mockCompany },
      });

      await expect(
        service.getInterviewsByApplication(mockStudentUser.id, 'app-1', UserRole.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getInterviewById', () => {
    it('throws NotFoundException if interview not found', async () => {
      mockDb.client.interview.findUnique.mockResolvedValue(null);

      await expect(
        service.getInterviewById(mockStudentUser.id, 'int-999', UserRole.STUDENT),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows student owner to view interview detail', async () => {
      const interview = {
        id: 'int-1',
        application: {
          student: { userId: mockStudentUser.id },
          job: { company: mockCompany },
        },
      };
      mockDb.client.interview.findUnique.mockResolvedValue(interview);

      const result = await service.getInterviewById(
        mockStudentUser.id,
        'int-1',
        UserRole.STUDENT,
      );

      expect(result).toBe(interview);
    });
  });
});
