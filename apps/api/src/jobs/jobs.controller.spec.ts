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
    updateJob: ReturnType<typeof vi.fn>;
    submitForApproval: ReturnType<typeof vi.fn>;
    withdrawToDraft: ReturnType<typeof vi.fn>;
    closeJob: ReturnType<typeof vi.fn>;
    deleteDraft: ReturnType<typeof vi.fn>;
  };

  const mockUser = {
    id: 'emp-user-1',
    email: 'employer@test.com',
    role: UserRole.EMPLOYER,
    status: 'ACTIVE' as const,
  };

  beforeEach(() => {
    service = {
      createDraft: vi.fn(),
      getMyJobs: vi.fn(),
      getJobById: vi.fn(),
      updateJob: vi.fn(),
      submitForApproval: vi.fn(),
      withdrawToDraft: vi.fn(),
      closeJob: vi.fn(),
      deleteDraft: vi.fn(),
    };

    controller = new JobsController(service as unknown as JobsService);
  });

  it('delegates create to service', async () => {
    const dto = { title: 'Backend Dev', description: 'Great job description here' };
    service.createDraft.mockResolvedValue({ id: 'job-1', ...dto });

    const result = await controller.create(mockUser, dto);

    expect(service.createDraft).toHaveBeenCalledWith(mockUser.id, dto);
    expect(result).toEqual({ id: 'job-1', ...dto });
  });

  it('delegates getMyJobs to service', async () => {
    const query = { page: 1, pageSize: 10, status: JobStatus.DRAFT };
    service.getMyJobs.mockResolvedValue({ data: [], meta: { total: 0 } });

    const result = await controller.getMyJobs(mockUser, query);

    expect(service.getMyJobs).toHaveBeenCalledWith(mockUser.id, query);
    expect(result).toEqual({ data: [], meta: { total: 0 } });
  });

  it('delegates getJobById to service', async () => {
    service.getJobById.mockResolvedValue({ id: 'job-1', title: 'Backend Dev' });

    const result = await controller.getJobById(mockUser, 'job-1');

    expect(service.getJobById).toHaveBeenCalledWith(mockUser.id, 'job-1');
    expect(result).toEqual({ id: 'job-1', title: 'Backend Dev' });
  });

  it('delegates updateJob to service', async () => {
    const dto = { title: 'New Title' };
    service.updateJob.mockResolvedValue({ id: 'job-1', ...dto });

    const result = await controller.updateJob(mockUser, 'job-1', dto);

    expect(service.updateJob).toHaveBeenCalledWith(mockUser.id, 'job-1', dto);
    expect(result).toEqual({ id: 'job-1', ...dto });
  });

  it('delegates submitForApproval to service', async () => {
    service.submitForApproval.mockResolvedValue({ id: 'job-1', status: 'PENDING_APPROVAL' });

    const result = await controller.submitForApproval(mockUser, 'job-1');

    expect(service.submitForApproval).toHaveBeenCalledWith(mockUser.id, 'job-1');
    expect(result).toEqual({ id: 'job-1', status: 'PENDING_APPROVAL' });
  });

  it('delegates withdrawToDraft to service', async () => {
    service.withdrawToDraft.mockResolvedValue({ id: 'job-1', status: 'DRAFT' });

    const result = await controller.withdrawToDraft(mockUser, 'job-1');

    expect(service.withdrawToDraft).toHaveBeenCalledWith(mockUser.id, 'job-1');
    expect(result).toEqual({ id: 'job-1', status: 'DRAFT' });
  });

  it('delegates closeJob to service', async () => {
    service.closeJob.mockResolvedValue({ id: 'job-1', status: 'CLOSED' });

    const result = await controller.closeJob(mockUser, 'job-1');

    expect(service.closeJob).toHaveBeenCalledWith(mockUser.id, 'job-1');
    expect(result).toEqual({ id: 'job-1', status: 'CLOSED' });
  });

  it('delegates deleteDraft to service', async () => {
    service.deleteDraft.mockResolvedValue({ success: true });

    const result = await controller.deleteDraft(mockUser, 'job-1');

    expect(service.deleteDraft).toHaveBeenCalledWith(mockUser.id, 'job-1');
    expect(result).toEqual({ success: true });
  });
});
