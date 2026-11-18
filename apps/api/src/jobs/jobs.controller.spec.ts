import { describe, expect, it, vi, beforeEach } from 'vitest';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { JobStatus, UserRole } from '../generated/prisma/enums.js';

describe('JobsController', () => {
  let controller: JobsController;
  let service: {
    createDraft: ReturnType<typeof vi.fn>;
    getMyJobs: ReturnType<typeof vi.fn>;
    getJobById: ReturnType<typeof vi.fn>;
    getPublicJobById: ReturnType<typeof vi.fn>;
    searchPublicJobs: ReturnType<typeof vi.fn>;
    updateJob: ReturnType<typeof vi.fn>;
    submitForApproval: ReturnType<typeof vi.fn>;
    withdrawToDraft: ReturnType<typeof vi.fn>;
    closeJob: ReturnType<typeof vi.fn>;
    deleteDraft: ReturnType<typeof vi.fn>;
    saveJob: ReturnType<typeof vi.fn>;
    unsaveJob: ReturnType<typeof vi.fn>;
    getSavedJobs: ReturnType<typeof vi.fn>;
    isJobSaved: ReturnType<typeof vi.fn>;
  };

  const mockEmployer = {
    id: 'emp-user-1',
    email: 'employer@test.com',
    role: UserRole.EMPLOYER,
    status: 'ACTIVE' as const,
  };

  const mockStudent = {
    id: 'student-user-1',
    email: 'student@test.com',
    role: UserRole.STUDENT,
    status: 'ACTIVE' as const,
  };

  beforeEach(() => {
    service = {
      createDraft: vi.fn(),
      getMyJobs: vi.fn(),
      getJobById: vi.fn(),
      getPublicJobById: vi.fn(),
      searchPublicJobs: vi.fn(),
      updateJob: vi.fn(),
      submitForApproval: vi.fn(),
      withdrawToDraft: vi.fn(),
      closeJob: vi.fn(),
      deleteDraft: vi.fn(),
      saveJob: vi.fn(),
      unsaveJob: vi.fn(),
      getSavedJobs: vi.fn(),
      isJobSaved: vi.fn(),
    };

    controller = new JobsController(service as unknown as JobsService);
  });

  describe('Public endpoints', () => {
    it('delegates searchPublicJobs to service', async () => {
      const query = { page: 1, pageSize: 20, search: 'NestJS' };
      service.searchPublicJobs.mockResolvedValue({ data: [], meta: { total: 0 } });

      const result = await controller.searchPublicJobs(query);

      expect(service.searchPublicJobs).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });

    it('delegates getPublicJobById to service', async () => {
      service.getPublicJobById.mockResolvedValue({ id: 'job-1', title: 'Public Job' });

      const result = await controller.getPublicJobById('job-1');

      expect(service.getPublicJobById).toHaveBeenCalledWith('job-1');
      expect(result).toEqual({ id: 'job-1', title: 'Public Job' });
    });
  });

  describe('Employer endpoints', () => {
    it('delegates create to service', async () => {
      const dto = { title: 'Backend Dev', description: 'Great job description here' };
      service.createDraft.mockResolvedValue({ id: 'job-1', ...dto });

      const result = await controller.create(mockEmployer, dto);

      expect(service.createDraft).toHaveBeenCalledWith(mockEmployer.id, dto);
      expect(result).toEqual({ id: 'job-1', ...dto });
    });

    it('delegates getMyJobs to service', async () => {
      const query = { page: 1, pageSize: 10, status: JobStatus.DRAFT };
      service.getMyJobs.mockResolvedValue({ data: [], meta: { total: 0 } });

      const result = await controller.getMyJobs(mockEmployer, query);

      expect(service.getMyJobs).toHaveBeenCalledWith(mockEmployer.id, query);
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });

    it('delegates getEmployerJobById to service', async () => {
      service.getJobById.mockResolvedValue({ id: 'job-1', title: 'Backend Dev' });

      const result = await controller.getEmployerJobById(mockEmployer, 'job-1');

      expect(service.getJobById).toHaveBeenCalledWith(mockEmployer.id, 'job-1');
      expect(result).toEqual({ id: 'job-1', title: 'Backend Dev' });
    });

    it('delegates updateJob to service', async () => {
      const dto = { title: 'New Title' };
      service.updateJob.mockResolvedValue({ id: 'job-1', ...dto });

      const result = await controller.updateJob(mockEmployer, 'job-1', dto);

      expect(service.updateJob).toHaveBeenCalledWith(mockEmployer.id, 'job-1', dto);
      expect(result).toEqual({ id: 'job-1', ...dto });
    });

    it('delegates submitForApproval to service', async () => {
      service.submitForApproval.mockResolvedValue({ id: 'job-1', status: 'PENDING_APPROVAL' });

      const result = await controller.submitForApproval(mockEmployer, 'job-1');

      expect(service.submitForApproval).toHaveBeenCalledWith(mockEmployer.id, 'job-1');
      expect(result).toEqual({ id: 'job-1', status: 'PENDING_APPROVAL' });
    });

    it('delegates withdrawToDraft to service', async () => {
      service.withdrawToDraft.mockResolvedValue({ id: 'job-1', status: 'DRAFT' });

      const result = await controller.withdrawToDraft(mockEmployer, 'job-1');

      expect(service.withdrawToDraft).toHaveBeenCalledWith(mockEmployer.id, 'job-1');
      expect(result).toEqual({ id: 'job-1', status: 'DRAFT' });
    });

    it('delegates closeJob to service', async () => {
      service.closeJob.mockResolvedValue({ id: 'job-1', status: 'CLOSED' });

      const result = await controller.closeJob(mockEmployer, 'job-1');

      expect(service.closeJob).toHaveBeenCalledWith(mockEmployer.id, 'job-1');
      expect(result).toEqual({ id: 'job-1', status: 'CLOSED' });
    });

    it('delegates deleteDraft to service', async () => {
      service.deleteDraft.mockResolvedValue({ success: true });

      const result = await controller.deleteDraft(mockEmployer, 'job-1');

      expect(service.deleteDraft).toHaveBeenCalledWith(mockEmployer.id, 'job-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Student Saved Jobs endpoints', () => {
    it('delegates saveJob to service', async () => {
      service.saveJob.mockResolvedValue({ success: true });

      const result = await controller.saveJob(mockStudent, 'job-1');

      expect(service.saveJob).toHaveBeenCalledWith(mockStudent.id, 'job-1');
      expect(result).toEqual({ success: true });
    });

    it('delegates unsaveJob to service', async () => {
      service.unsaveJob.mockResolvedValue({ success: true });

      const result = await controller.unsaveJob(mockStudent, 'job-1');

      expect(service.unsaveJob).toHaveBeenCalledWith(mockStudent.id, 'job-1');
      expect(result).toEqual({ success: true });
    });

    it('delegates getSavedJobs to service', async () => {
      service.getSavedJobs.mockResolvedValue({ data: [], meta: { total: 0 } });

      const result = await controller.getSavedJobs(mockStudent, { page: 1, pageSize: 20 });

      expect(service.getSavedJobs).toHaveBeenCalledWith(mockStudent.id, { page: 1, pageSize: 20 });
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });

    it('delegates isJobSaved to service', async () => {
      service.isJobSaved.mockResolvedValue({ isSaved: true });

      const result = await controller.isJobSaved(mockStudent, 'job-1');

      expect(service.isJobSaved).toHaveBeenCalledWith(mockStudent.id, 'job-1');
      expect(result).toEqual({ isSaved: true });
    });
  });
});
