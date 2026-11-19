import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  NotificationType,
  UserRole,
  VerificationStatus,
} from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { canTransitionCompanyVerification } from '../recruitment/recruitment-transitions.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { VerifyCompanyDto } from './dto/verify-company.dto.js';
import { QueryCompaniesDto } from './dto/query-companies.dto.js';

@Injectable()
export class CompaniesService {
  constructor(private readonly db: DatabaseService) {}

  async create(employerUserId: string, dto: CreateCompanyDto) {
    const employer = await this.db.client.employerProfile.findUnique({
      where: { userId: employerUserId },
    });
    if (!employer) {
      throw new NotFoundException({
        code: 'EMPLOYER_PROFILE_NOT_FOUND',
        message: 'Employer profile does not exist for this account',
      });
    }
    if (employer.companyId) {
      throw new ConflictException({
        code: 'COMPANY_ALREADY_EXISTS',
        message: 'Employer profile already has an associated company',
      });
    }

    if (dto.taxCode) {
      const existing = await this.db.client.company.findUnique({
        where: { taxCode: dto.taxCode },
      });
      if (existing) {
        throw new ConflictException({
          code: 'TAX_CODE_EXISTS',
          message: 'A company with this tax code is already registered',
        });
      }
    }

    return this.db.client.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.name,
          description: dto.description,
          website: dto.website,
          location: dto.location,
          taxCode: dto.taxCode,
          verificationStatus: VerificationStatus.PENDING,
        },
      });

      // Atomically claim the employer profile slot where companyId is still null
      const claimResult = await tx.employerProfile.updateMany({
        where: { id: employer.id, companyId: null },
        data: { companyId: company.id },
      });

      if (claimResult.count === 0) {
        throw new BadRequestException({
          code: 'COMPANY_ALREADY_EXISTS',
          message: 'Employer already has a company profile',
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'COMPANY_CREATED',
          entity: 'Company',
          entityId: company.id,
          metadata: {
            name: company.name,
            taxCode: company.taxCode,
          },
        },
      });

      return company;
    });
  }

  async getMyCompany(employerUserId: string) {
    const employer = await this.db.client.employerProfile.findUnique({
      where: { userId: employerUserId },
      include: { company: true },
    });
    if (!employer) {
      throw new NotFoundException({
        code: 'EMPLOYER_PROFILE_NOT_FOUND',
        message: 'Employer profile does not exist for this account',
      });
    }
    if (!employer.company) {
      throw new NotFoundException({
        code: 'COMPANY_NOT_FOUND',
        message: 'No company profile linked to this employer account',
      });
    }
    return employer.company;
  }

  async updateMyCompany(employerUserId: string, dto: UpdateCompanyDto) {
    const employer = await this.db.client.employerProfile.findUnique({
      where: { userId: employerUserId },
      include: { company: true },
    });
    if (!employer?.company) {
      throw new NotFoundException({
        code: 'COMPANY_NOT_FOUND',
        message: 'No company profile linked to this employer account',
      });
    }

    if (dto.taxCode && dto.taxCode !== employer.company.taxCode) {
      const existing = await this.db.client.company.findFirst({
        where: {
          taxCode: dto.taxCode,
          NOT: { id: employer.company.id },
        },
      });
      if (existing) {
        throw new ConflictException({
          code: 'TAX_CODE_EXISTS',
          message: 'A company with this tax code is already registered',
        });
      }
    }

    const nextVerificationStatus =
      employer.company.verificationStatus === VerificationStatus.REJECTED
        ? VerificationStatus.PENDING
        : employer.company.verificationStatus;

    return this.db.client.$transaction(async (tx) => {
      const changed = await tx.company.updateMany({
        where: {
          id: employer.company!.id,
          verificationStatus: employer.company!.verificationStatus,
        },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.website !== undefined ? { website: dto.website } : {}),
          ...(dto.location !== undefined ? { location: dto.location } : {}),
          ...(dto.taxCode !== undefined ? { taxCode: dto.taxCode } : {}),
          verificationStatus: nextVerificationStatus,
          ...(nextVerificationStatus === VerificationStatus.PENDING
            ? { verifiedAt: null }
            : {}),
        },
      });
      if (changed.count !== 1)
        throw new ConflictException({
          code: 'COMPANY_STATE_CHANGED',
          message: 'Company verification changed; reload before editing',
        });
      const updated = await tx.company.findUniqueOrThrow({
        where: { id: employer.company!.id },
      });

      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'COMPANY_UPDATED',
          entity: 'Company',
          entityId: updated.id,
          metadata: {
            changes: JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue,
            resubmittedForVerification:
              employer.company!.verificationStatus ===
              VerificationStatus.REJECTED,
          },
        },
      });

      return updated;
    });
  }

  async getById(id: string) {
    const company = await this.db.client.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        website: true,
        location: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    if (!company) {
      throw new NotFoundException({
        code: 'COMPANY_NOT_FOUND',
        message: 'Company not found',
      });
    }

    return company;
  }

  async adminFindAll(query: QueryCompaniesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (query.status) {
      where.verificationStatus = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { taxCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.db.client.company.count({ where }),
      this.db.client.company.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              jobs: true,
              employers: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async adminVerify(
    adminUserId: string,
    companyId: string,
    dto: VerifyCompanyDto,
  ) {
    const company = await this.db.client.company.findUnique({
      where: { id: companyId },
      include: {
        employers: {
          select: { userId: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException({
        code: 'COMPANY_NOT_FOUND',
        message: 'Company not found',
      });
    }

    if (
      dto.status === VerificationStatus.REJECTED &&
      (!dto.reason || dto.reason.trim().length < 10)
    ) {
      throw new BadRequestException({
        code: 'REJECTION_REASON_REQUIRED',
        message: 'A rejection reason of at least 10 characters is required',
      });
    }

    const isValidTransition = canTransitionCompanyVerification(
      company.verificationStatus,
      dto.status,
      UserRole.ADMIN,
    );

    if (!isValidTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot transition company verification from ${company.verificationStatus} to ${dto.status}`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const updateResult = await tx.company.updateMany({
        where: {
          id: companyId,
          // Preserve revocation/re-verification while rejecting stale decisions.
          verificationStatus: company.verificationStatus,
        },
        data: {
          verificationStatus: dto.status,
          verifiedAt:
            dto.status === VerificationStatus.VERIFIED ? new Date() : null,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Company verification status has changed since the decision',
        });
      }

      const updated = await tx.company.findUniqueOrThrow({
        where: { id: companyId },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUserId,
          action:
            dto.status === VerificationStatus.VERIFIED
              ? 'COMPANY_VERIFIED'
              : 'COMPANY_REJECTED',
          entity: 'Company',
          entityId: company.id,
          metadata: {
            previousStatus: company.verificationStatus,
            newStatus: dto.status,
            reason: dto.reason ?? null,
          },
        },
      });

      const notificationType =
        dto.status === VerificationStatus.VERIFIED
          ? NotificationType.COMPANY_VERIFIED
          : NotificationType.COMPANY_VERIFICATION_REQUIRED;

      const notificationTitle =
        dto.status === VerificationStatus.VERIFIED
          ? 'Company Verified'
          : 'Company Verification Rejected';

      const notificationBody =
        dto.status === VerificationStatus.VERIFIED
          ? `Your company "${company.name}" has been verified successfully. You can now publish jobs.`
          : `Your company "${company.name}" verification was rejected: ${dto.reason}`;

      for (const employer of company.employers) {
        await tx.notification.create({
          data: {
            userId: employer.userId,
            type: notificationType,
            title: notificationTitle,
            body: notificationBody,
            data: {
              companyId: company.id,
              status: dto.status,
              reason: dto.reason ?? null,
            },
          },
        });
      }

      return updated;
    });
  }
}
