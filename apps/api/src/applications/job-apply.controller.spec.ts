import { describe, expect, it, vi, beforeEach } from 'vitest';
import { JobApplyController } from './job-apply.controller.js';
import { ApplicationsService } from './applications.service.js';
import { ApplicationStatus, UserRole } from '../generated/prisma/enums.js';

describe('JobApplyController', () => {
  let controller: JobApplyController;
  let service: {
    applyForJob: ReturnType<typeof vi.fn>;
    getJobApplications: ReturnType<typeof vi.fn>;
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
      getJobApplications: vi.fn(),
    };

    controller = new JobApplyController(
      service as unknown as ApplicationsService,
    );
  });

  it('delegates apply to service.applyForJob', async () => {
    const mockResult = { id: 'app-1', status: ApplicationStatus.SUBMITTED };
    service.applyForJob.mockResolvedValue(mockResult);

    const dto = { coverLetter: 'Applying directly via /jobs/:id/apply' };
    const result = await controller.apply(mockStudent, 'job-direct-1', dto);

    expect(service.applyForJob).toHaveBeenCalledWith(
      mockStudent.id,
      'job-direct-1',
      dto,
    );
    expect(result).toBe(mockResult);
  });

  it('delegates getJobApplications to service.getJobApplications with user role', async () => {
    const mockResult = { data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } };
    service.getJobApplications.mockResolvedValue(mockResult);

    const query = { page: 1, pageSize: 10, status: ApplicationStatus.SUBMITTED };
    const result = await controller.getJobApplications(mockEmployer, 'job-direct-1', query);

    expect(service.getJobApplications).toHaveBeenCalledWith(
      mockEmployer.id,
      'job-direct-1',
      query,
      mockEmployer.role,
    );
    expect(result).toBe(mockResult);
  });
});
