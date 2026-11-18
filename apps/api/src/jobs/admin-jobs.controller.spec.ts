import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminJobsController } from './admin-jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { JobStatus, UserRole } from '../generated/prisma/enums.js';

describe('AdminJobsController', () => {
  let controller: AdminJobsController;
  let service: {
    adminFindAll: ReturnType<typeof vi.fn>;
    adminModerate: ReturnType<typeof vi.fn>;
  };

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@careermatch.local',
    role: UserRole.ADMIN,
    status: 'ACTIVE' as const,
  };

  beforeEach(() => {
    service = {
      adminFindAll: vi.fn(),
      adminModerate: vi.fn(),
    };

    controller = new AdminJobsController(service as unknown as JobsService);
  });

  it('delegates findAll to service with query', async () => {
    const query = { page: 1, pageSize: 20, status: JobStatus.PENDING_APPROVAL };
    service.adminFindAll.mockResolvedValue({ data: [], meta: { total: 0 } });

    const result = await controller.findAll(query);

    expect(service.adminFindAll).toHaveBeenCalledWith(query);
    expect(result).toEqual({ data: [], meta: { total: 0 } });
  });

  it('delegates moderate to service with admin id, job id, and dto', async () => {
    const dto = { status: JobStatus.PUBLISHED };
    service.adminModerate.mockResolvedValue({ id: 'job-1', status: 'PUBLISHED' });

    const result = await controller.moderate(mockAdmin, 'job-1', dto);

    expect(service.adminModerate).toHaveBeenCalledWith(mockAdmin.id, 'job-1', dto);
    expect(result).toEqual({ id: 'job-1', status: 'PUBLISHED' });
  });
});
