import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SavedJobsController } from './saved-jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { UserRole } from '../generated/prisma/enums.js';

describe('SavedJobsController', () => {
  let controller: SavedJobsController;
  let service: {
    getSavedJobs: ReturnType<typeof vi.fn>;
    saveJob: ReturnType<typeof vi.fn>;
    unsaveJob: ReturnType<typeof vi.fn>;
    isJobSaved: ReturnType<typeof vi.fn>;
  };

  const mockStudent = {
    id: 'student-user-1',
    email: 'student@careermatch.local',
    role: UserRole.STUDENT,
    status: 'ACTIVE' as const,
  };

  beforeEach(() => {
    service = {
      getSavedJobs: vi.fn(),
      saveJob: vi.fn(),
      unsaveJob: vi.fn(),
      isJobSaved: vi.fn(),
    };

    controller = new SavedJobsController(service as unknown as JobsService);
  });

  it('delegates getSavedJobs to service', async () => {
    service.getSavedJobs.mockResolvedValue({ data: [], meta: { total: 0 } });

    const result = await controller.getSavedJobs(mockStudent, { page: 1, pageSize: 10 });

    expect(service.getSavedJobs).toHaveBeenCalledWith(mockStudent.id, { page: 1, pageSize: 10 });
    expect(result).toEqual({ data: [], meta: { total: 0 } });
  });

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

  it('delegates isJobSaved to service', async () => {
    service.isJobSaved.mockResolvedValue({ isSaved: false });

    const result = await controller.isJobSaved(mockStudent, 'job-1');

    expect(service.isJobSaved).toHaveBeenCalledWith(mockStudent.id, 'job-1');
    expect(result).toEqual({ isSaved: false });
  });
});
