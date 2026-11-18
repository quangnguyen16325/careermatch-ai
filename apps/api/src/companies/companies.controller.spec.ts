import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CompaniesController } from './companies.controller.js';
import { AdminCompaniesController } from './admin-companies.controller.js';
import { CompaniesService } from './companies.service.js';
import { UserRole, VerificationStatus } from '../generated/prisma/enums.js';

describe('Companies Controllers', () => {
  let companiesService: {
    create: ReturnType<typeof vi.fn>;
    getMyCompany: ReturnType<typeof vi.fn>;
    updateMyCompany: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    adminFindAll: ReturnType<typeof vi.fn>;
    adminVerify: ReturnType<typeof vi.fn>;
  };
  let controller: CompaniesController;
  let adminController: AdminCompaniesController;

  const mockUser = {
    id: 'emp-user-1',
    email: 'employer@careermatch.local',
    role: UserRole.EMPLOYER,
    status: 'ACTIVE' as const,
  };

  const mockAdmin = {
    id: 'admin-user-1',
    email: 'admin@careermatch.local',
    role: UserRole.ADMIN,
    status: 'ACTIVE' as const,
  };

  beforeEach(() => {
    companiesService = {
      create: vi.fn(),
      getMyCompany: vi.fn(),
      updateMyCompany: vi.fn(),
      getById: vi.fn(),
      adminFindAll: vi.fn(),
      adminVerify: vi.fn(),
    };

    controller = new CompaniesController(
      companiesService as unknown as CompaniesService,
    );
    adminController = new AdminCompaniesController(
      companiesService as unknown as CompaniesService,
    );
  });

  describe('CompaniesController', () => {
    it('delegates create to service with current user id', async () => {
      const dto = { name: 'Acme Corp', taxCode: '0312345678' };
      companiesService.create.mockResolvedValue({ id: 'comp-1', ...dto });

      const result = await controller.create(mockUser, dto);

      expect(companiesService.create).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toEqual({ id: 'comp-1', ...dto });
    });

    it('delegates getMyCompany to service with current user id', async () => {
      companiesService.getMyCompany.mockResolvedValue({ id: 'comp-1' });

      const result = await controller.getMyCompany(mockUser);

      expect(companiesService.getMyCompany).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ id: 'comp-1' });
    });

    it('delegates updateMyCompany to service with current user id and dto', async () => {
      const dto = { name: 'Updated Name' };
      companiesService.updateMyCompany.mockResolvedValue({ id: 'comp-1', ...dto });

      const result = await controller.updateMyCompany(mockUser, dto);

      expect(companiesService.updateMyCompany).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toEqual({ id: 'comp-1', ...dto });
    });

    it('delegates getById to service', async () => {
      companiesService.getById.mockResolvedValue({ id: 'comp-1', name: 'Public Corp' });

      const result = await controller.getById('comp-1');

      expect(companiesService.getById).toHaveBeenCalledWith('comp-1');
      expect(result).toEqual({ id: 'comp-1', name: 'Public Corp' });
    });
  });

  describe('AdminCompaniesController', () => {
    it('delegates findAll to service with query dto', async () => {
      const query = { page: 1, pageSize: 10, status: VerificationStatus.PENDING };
      companiesService.adminFindAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      const result = await adminController.findAll(query);

      expect(companiesService.adminFindAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });

    it('delegates verify to service with admin id, company id, and dto', async () => {
      const dto = { status: VerificationStatus.VERIFIED };
      companiesService.adminVerify.mockResolvedValue({ id: 'comp-1', verificationStatus: 'VERIFIED' });

      const result = await adminController.verify(mockAdmin, 'comp-1', dto);

      expect(companiesService.adminVerify).toHaveBeenCalledWith(mockAdmin.id, 'comp-1', dto);
      expect(result).toEqual({ id: 'comp-1', verificationStatus: 'VERIFIED' });
    });
  });
});
