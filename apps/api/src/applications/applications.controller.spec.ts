import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { ApplicationStatus, UserRole } from '../generated/prisma/enums.js';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let service: {
    applyForJob: ReturnType<typeof vi.fn>;
    withdrawApplication: ReturnType<typeof vi.fn>;
    getMyApplications: ReturnType<typeof vi.fn>;
    getApplicationById: ReturnType<typeof vi.fn>;
    getEmployerApplications: ReturnType<typeof vi.fn>;
    reviewApplication: ReturnType<typeof vi.fn>;
    shortlistApplication: ReturnType<typeof vi.fn>;
  };

  const mockStudent = {
    id: 'student-user-1',
    email: 'student@careermatch.local',
    role: UserRole.STUDENT,
    status: 'ACTIVE' as const,
  };

  const mockEmployer = {
    id: 'employer-user-1',
    email: 'employer@careermatch.local',
    role: UserRole.EMPLOYER,
    status: 'ACTIVE' as const,
  };

  beforeEach(() => {
    service = {
      applyForJob: vi.fn(),
      withdrawApplication: vi.fn(),
      getMyApplications: vi.fn(),
      getApplicationById: vi.fn(),
      getEmployerApplications: vi.fn(),
      reviewApplication: vi.fn(),
      shortlistApplication: vi.fn(),
    };

    controller = new ApplicationsController(
      service as unknown as ApplicationsService,
    );
  });

  describe('apply', () => {
    it('throws BadRequestException if jobId is missing in DTO', async () => {
      await expect(
        controller.apply(mockStudent, { coverLetter: 'Cover letter' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('delegates to service.applyForJob when jobId is present', async () => {
      const mockResult = { id: 'app-1', status: ApplicationStatus.SUBMITTED };
      service.applyForJob.mockResolvedValue(mockResult);

      const dto = { jobId: 'job-1', coverLetter: 'Hello' };
      const result = await controller.apply(mockStudent, dto);

      expect(service.applyForJob).toHaveBeenCalledWith(
        mockStudent.id,
        'job-1',
        dto,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('applyWithJobId', () => {
    it('delegates to service.applyForJob with path param jobId', async () => {
      const mockResult = { id: 'app-1', status: ApplicationStatus.SUBMITTED };
      service.applyForJob.mockResolvedValue(mockResult);

      const dto = { coverLetter: 'Hello from path' };
      const result = await controller.applyWithJobId(
        mockStudent,
        'job-path-1',
        dto,
      );

      expect(service.applyForJob).toHaveBeenCalledWith(
        mockStudent.id,
        'job-path-1',
        dto,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('withdraw', () => {
    it('delegates to service.withdrawApplication', async () => {
      const mockResult = { id: 'app-1', status: ApplicationStatus.WITHDRAWN };
      service.withdrawApplication.mockResolvedValue(mockResult);

      const dto = { reason: 'Accepted another offer' };
      const result = await controller.withdraw(mockStudent, 'app-1', dto);

      expect(service.withdrawApplication).toHaveBeenCalledWith(
        mockStudent.id,
        'app-1',
        dto,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('getMyApplications', () => {
    it('delegates to service.getMyApplications', async () => {
      const mockResult = { data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } };
      service.getMyApplications.mockResolvedValue(mockResult);

      const query = { page: 1, pageSize: 10, status: ApplicationStatus.SUBMITTED };
      const result = await controller.getMyApplications(mockStudent, query);

      expect(service.getMyApplications).toHaveBeenCalledWith(
        mockStudent.id,
        query,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('getEmployerApplications', () => {
    it('delegates to service.getEmployerApplications with user role', async () => {
      const mockResult = { data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } };
      service.getEmployerApplications.mockResolvedValue(mockResult);

      const query = { page: 1, pageSize: 10, status: ApplicationStatus.SUBMITTED };
      const result = await controller.getEmployerApplications(mockEmployer, query);

      expect(service.getEmployerApplications).toHaveBeenCalledWith(
        mockEmployer.id,
        query,
        mockEmployer.role,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('reviewApplication', () => {
    it('delegates to service.reviewApplication', async () => {
      const mockResult = { id: 'app-1', status: ApplicationStatus.REVIEWING };
      service.reviewApplication.mockResolvedValue(mockResult);

      const dto = { note: 'Checking CV' };
      const result = await controller.reviewApplication(mockEmployer, 'app-1', dto);

      expect(service.reviewApplication).toHaveBeenCalledWith(
        mockEmployer.id,
        'app-1',
        dto,
        mockEmployer.role,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('shortlistApplication', () => {
    it('delegates to service.shortlistApplication', async () => {
      const mockResult = { id: 'app-1', status: ApplicationStatus.SHORTLISTED };
      service.shortlistApplication.mockResolvedValue(mockResult);

      const dto = { note: 'Top candidate' };
      const result = await controller.shortlistApplication(mockEmployer, 'app-1', dto);

      expect(service.shortlistApplication).toHaveBeenCalledWith(
        mockEmployer.id,
        'app-1',
        dto,
        mockEmployer.role,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('getById', () => {
    it('delegates to service.getApplicationById with user role', async () => {
      const mockResult = { id: 'app-1' };
      service.getApplicationById.mockResolvedValue(mockResult);

      const result = await controller.getById(mockEmployer, 'app-1');

      expect(service.getApplicationById).toHaveBeenCalledWith(
        mockEmployer.id,
        'app-1',
        mockEmployer.role,
      );
      expect(result).toBe(mockResult);
    });
  });
});
