import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service.js';
import { DatabaseService } from '../database/database.service.js';
import {
  NotificationType,
  VerificationStatus,
} from '../generated/prisma/enums.js';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let mockDb: {
    client: {
      employerProfile: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        updateMany: ReturnType<typeof vi.fn>;
      };
      company: {
        findUnique: ReturnType<typeof vi.fn>;
        findUniqueOrThrow: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        updateMany: ReturnType<typeof vi.fn>;
      };
      auditLog: {
        create: ReturnType<typeof vi.fn>;
      };
      notification: {
        create: ReturnType<typeof vi.fn>;
      };
      $transaction: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockDb = {
      client: {
        employerProfile: {
          findUnique: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        company: {
          findUnique: vi.fn(),
          findUniqueOrThrow: vi.fn(),
          findFirst: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        auditLog: {
          create: vi.fn(),
        },
        notification: {
          create: vi.fn(),
        },
        $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
          cb(mockDb.client),
        ),
      },
    };

    service = new CompaniesService(mockDb as unknown as DatabaseService);
  });

  describe('create', () => {
    it('throws NotFoundException when employer profile does not exist', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', { name: 'Test Corp' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when employer already has a company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        id: 'emp-1',
        userId: 'user-1',
        companyId: 'comp-1',
      });

      await expect(
        service.create('user-1', { name: 'Test Corp' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when tax code is already registered', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        id: 'emp-1',
        userId: 'user-1',
        companyId: null,
      });
      mockDb.client.company.findUnique.mockResolvedValue({
        id: 'comp-existing',
        taxCode: '0312345678',
      });

      await expect(
        service.create('user-1', {
          name: 'Test Corp',
          taxCode: '0312345678',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates company, links employer, and creates audit log', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        id: 'emp-1',
        userId: 'user-1',
        companyId: null,
      });
      mockDb.client.company.findUnique.mockResolvedValue(null);

      const createdCompany = {
        id: 'comp-new',
        name: 'Acme Corp',
        taxCode: '0312345678',
        verificationStatus: VerificationStatus.PENDING,
      };
      mockDb.client.company.create.mockResolvedValue(createdCompany);

      const result = await service.create('user-1', {
        name: 'Acme Corp',
        taxCode: '0312345678',
      });

      expect(result).toEqual(createdCompany);
      expect(mockDb.client.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Acme Corp',
          taxCode: '0312345678',
          verificationStatus: VerificationStatus.PENDING,
        }),
      });
      expect(mockDb.client.employerProfile.updateMany).toHaveBeenCalledWith({
        where: { id: 'emp-1', companyId: null },
        data: { companyId: 'comp-new' },
      });
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          action: 'COMPANY_CREATED',
          entity: 'Company',
          entityId: 'comp-new',
        }),
      });
    });

    it('throws BadRequestException if employer company slot was claimed concurrently', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        id: 'emp-1',
        userId: 'user-1',
        companyId: null,
      });
      mockDb.client.company.findUnique.mockResolvedValue(null);
      mockDb.client.company.create.mockResolvedValue({
        id: 'comp-new',
        name: 'Acme Corp',
      });
      // Simulate race condition: another transaction already claimed the slot
      mockDb.client.employerProfile.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.create('user-1', {
          name: 'Acme Corp',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyCompany', () => {
    it('throws NotFoundException when employer profile does not exist', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getMyCompany('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when employer has no company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        id: 'emp-1',
        company: null,
      });

      await expect(service.getMyCompany('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns linked company profile', async () => {
      const company = {
        id: 'comp-1',
        name: 'Acme Corp',
        verificationStatus: VerificationStatus.VERIFIED,
      };
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        id: 'emp-1',
        company,
      });

      const result = await service.getMyCompany('user-1');
      expect(result).toEqual(company);
    });
  });

  describe('updateMyCompany', () => {
    it('throws NotFoundException when company is not found', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMyCompany('user-1', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when updating taxCode to one already in use', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        id: 'emp-1',
        company: { id: 'comp-1', taxCode: '0310000000' },
      });
      mockDb.client.company.findFirst.mockResolvedValue({
        id: 'comp-2',
        taxCode: '0319999999',
      });

      await expect(
        service.updateMyCompany('user-1', { taxCode: '0319999999' }),
      ).rejects.toThrow(ConflictException);
    });

    it('resets verificationStatus to PENDING when updating a REJECTED company', async () => {
      mockDb.client.employerProfile.findUnique.mockResolvedValue({
        id: 'emp-1',
        company: {
          id: 'comp-1',
          name: 'Old Name',
          verificationStatus: VerificationStatus.REJECTED,
        },
      });

      mockDb.client.company.update.mockResolvedValue({
        id: 'comp-1',
        name: 'New Name',
        verificationStatus: VerificationStatus.PENDING,
      });

      const result = await service.updateMyCompany('user-1', {
        name: 'New Name',
      });

      expect(result.verificationStatus).toBe(VerificationStatus.PENDING);
      expect(mockDb.client.company.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Name',
            verificationStatus: VerificationStatus.PENDING,
          }),
        }),
      );
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when company does not exist', async () => {
      mockDb.client.company.findUnique.mockResolvedValue(null);

      await expect(service.getById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns public view of company', async () => {
      const publicView = {
        id: 'comp-1',
        name: 'Acme Corp',
        description: 'Tech solutions',
        website: 'https://acme.vn',
        location: 'Hanoi',
        verificationStatus: VerificationStatus.VERIFIED,
        createdAt: new Date(),
      };
      mockDb.client.company.findUnique.mockResolvedValue(publicView);

      const result = await service.getById('comp-1');
      expect(result).toEqual(publicView);
    });
  });

  describe('adminFindAll', () => {
    it('paginates and filters companies', async () => {
      mockDb.client.company.count.mockResolvedValue(1);
      mockDb.client.company.findMany.mockResolvedValue([
        { id: 'comp-1', name: 'Acme' },
      ]);

      const result = await service.adminFindAll({
        page: 1,
        pageSize: 10,
        status: VerificationStatus.PENDING,
        search: 'Acme',
      });

      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('adminVerify', () => {
    it('throws NotFoundException if company does not exist', async () => {
      mockDb.client.company.findUnique.mockResolvedValue(null);

      await expect(
        service.adminVerify('admin-1', 'comp-1', {
          status: VerificationStatus.VERIFIED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if rejecting without a valid reason', async () => {
      mockDb.client.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        verificationStatus: VerificationStatus.PENDING,
        employers: [{ userId: 'user-emp-1' }],
      });

      await expect(
        service.adminVerify('admin-1', 'comp-1', {
          status: VerificationStatus.REJECTED,
          reason: 'too short',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException on invalid state transition', async () => {
      mockDb.client.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        verificationStatus: VerificationStatus.VERIFIED,
        employers: [{ userId: 'user-emp-1' }],
      });

      // From VERIFIED, transitioning to VERIFIED again is invalid
      await expect(
        service.adminVerify('admin-1', 'comp-1', {
          status: VerificationStatus.VERIFIED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('verifies company, sets verifiedAt, logs audit, and creates notification', async () => {
      mockDb.client.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Acme Corp',
        verificationStatus: VerificationStatus.PENDING,
        employers: [{ userId: 'emp-user-1' }],
      });
      mockDb.client.company.findUniqueOrThrow.mockResolvedValue({
        id: 'comp-1',
        name: 'Acme Corp',
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      });

      const result = await service.adminVerify('admin-1', 'comp-1', {
        status: VerificationStatus.VERIFIED,
      });

      expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(mockDb.client.company.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'comp-1',
            verificationStatus: VerificationStatus.PENDING,
          },
          data: expect.objectContaining({
            verificationStatus: VerificationStatus.VERIFIED,
            verifiedAt: expect.any(Date),
          }),
        }),
      );
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'COMPANY_VERIFIED',
          entity: 'Company',
          entityId: 'comp-1',
        }),
      });
      expect(mockDb.client.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'emp-user-1',
          type: NotificationType.COMPANY_VERIFIED,
        }),
      });
    });

    it('rejects company, sets verifiedAt null, and notifies employers with reason', async () => {
      mockDb.client.company.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Fake Corp',
        verificationStatus: VerificationStatus.PENDING,
        employers: [{ userId: 'emp-user-1' }],
      });
      mockDb.client.company.findUniqueOrThrow.mockResolvedValue({
        id: 'comp-1',
        name: 'Fake Corp',
        verificationStatus: VerificationStatus.REJECTED,
        verifiedAt: null,
      });

      const reason = 'Invalid business registration license number provided';
      const result = await service.adminVerify('admin-1', 'comp-1', {
        status: VerificationStatus.REJECTED,
        reason,
      });

      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED);
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'COMPANY_REJECTED',
          entity: 'Company',
          entityId: 'comp-1',
        }),
      });
      expect(mockDb.client.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'emp-user-1',
          type: NotificationType.COMPANY_VERIFICATION_REQUIRED,
          body: expect.stringContaining(reason),
        }),
      });
    });
  });
});
