import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  JobStatus,
  NotificationType,
  UserRole,
  VerificationStatus,
} from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { canTransitionJob } from '../recruitment/recruitment-transitions.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { QueryEmployerJobsDto } from './dto/query-jobs.dto.js';
import { ModerateJobDto } from './dto/moderate-job.dto.js';
import { QueryAdminJobsDto } from './dto/query-admin-jobs.dto.js';
import { QueryPublicJobsDto } from './dto/query-public-jobs.dto.js';
import { QuerySavedJobsDto } from './dto/query-saved-jobs.dto.js';

@Injectable()
export class JobsService {
  constructor(private readonly db: DatabaseService) {}

  private async getEmployerWithCompany(employerUserId: string) {
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

    if (!employer.companyId || !employer.company) {
      throw new BadRequestException({
        code: 'COMPANY_PROFILE_REQUIRED',
        message: 'You must create a company profile before managing jobs',
      });
    }

    return employer;
  }

  private async validateSkillsExist(skillIds: string[]) {
    if (skillIds.length === 0) return;
    const existing = await this.db.client.skill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true },
    });
    if (existing.length !== skillIds.length) {
      throw new BadRequestException({
        code: 'INVALID_SKILLS',
        message: 'One or more specified skills do not exist',
      });
    }
  }

  private async validateCategoryExists(categoryId?: string) {
    if (!categoryId) return;
    const category = await this.db.client.careerCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException({
        code: 'INVALID_CATEGORY',
        message: 'Specified career category does not exist',
      });
    }
  }

  async createDraft(employerUserId: string, dto: CreateJobDto) {
    const employer = await this.getEmployerWithCompany(employerUserId);
    await this.validateCategoryExists(dto.categoryId);

    if (dto.skills?.length) {
      await this.validateSkillsExist(dto.skills.map((s) => s.skillId));
    }

    return this.db.client.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          companyId: employer.companyId!,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          workMode: dto.workMode,
          categoryId: dto.categoryId,
          status: JobStatus.DRAFT,
          skills: dto.skills?.length
            ? {
                create: dto.skills.map((s) => ({
                  skillId: s.skillId,
                  required: s.required ?? true,
                  weight: s.weight ?? 1,
                })),
              }
            : undefined,
        },
        include: {
          skills: {
            include: { skill: true },
          },
          category: true,
          company: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'JOB_CREATED',
          entity: 'Job',
          entityId: job.id,
          metadata: {
            title: job.title,
            companyId: employer.companyId,
          },
        },
      });

      return job;
    });
  }

  async getMyJobs(employerUserId: string, query: QueryEmployerJobsDto) {
    const employer = await this.getEmployerWithCompany(employerUserId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      companyId: employer.companyId!,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.db.client.job.count({ where }),
      this.db.client.job.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          skills: {
            include: { skill: true },
          },
          _count: {
            select: { applications: true },
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

  async getJobById(employerUserId: string, jobId: string) {
    const employer = await this.getEmployerWithCompany(employerUserId);

    const job = await this.db.client.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        category: true,
        skills: {
          include: { skill: true },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found',
      });
    }

    if (job.companyId !== employer.companyId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this job',
      });
    }

    return job;
  }

  async updateJob(employerUserId: string, jobId: string, dto: UpdateJobDto) {
    const employer = await this.getEmployerWithCompany(employerUserId);

    const job = await this.db.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        companyId: true,
        status: true,
      },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found',
      });
    }

    if (job.companyId !== employer.companyId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to modify this job',
      });
    }

    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.REJECTED) {
      throw new BadRequestException({
        code: 'CANNOT_EDIT_JOB',
        message: `Jobs in ${job.status} status cannot be edited. Withdraw to draft first.`,
      });
    }

    if (dto.categoryId) {
      await this.validateCategoryExists(dto.categoryId);
    }

    if (Array.isArray(dto.skills) && dto.skills.length > 0) {
      await this.validateSkillsExist(dto.skills.map((s) => s.skillId));
    }

    return this.db.client.$transaction(async (tx) => {
      const updateResult = await tx.job.updateMany({
        where: {
          id: jobId,
          companyId: employer.companyId!,
          status: { in: [JobStatus.DRAFT, JobStatus.REJECTED] },
        },
        data: {
          updatedAt: new Date(),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.location !== undefined ? { location: dto.location } : {}),
          ...(dto.workMode !== undefined ? { workMode: dto.workMode } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'CANNOT_EDIT_JOB',
          message: 'Job status has changed or cannot be edited. It must be in DRAFT or REJECTED status.',
        });
      }

      if (Array.isArray(dto.skills)) {
        await tx.jobSkill.deleteMany({
          where: { jobId },
        });

        if (dto.skills.length > 0) {
          await tx.jobSkill.createMany({
            data: dto.skills.map((s) => ({
              jobId,
              skillId: s.skillId,
              required: s.required ?? true,
              weight: s.weight ?? 1,
            })),
          });
        }
      }

      const updated = await tx.job.findUniqueOrThrow({
        where: { id: jobId },
        include: {
          skills: {
            include: { skill: true },
          },
          category: true,
          company: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'JOB_UPDATED',
          entity: 'Job',
          entityId: jobId,
          metadata: {
            changes: JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue,
          },
        },
      });

      return updated;
    });
  }

  async submitForApproval(employerUserId: string, jobId: string) {
    const employer = await this.getEmployerWithCompany(employerUserId);

    const job = await this.db.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        companyId: true,
        status: true,
      },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found',
      });
    }

    if (job.companyId !== employer.companyId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to submit this job',
      });
    }

    const isCompanyVerified =
      employer.company!.verificationStatus === VerificationStatus.VERIFIED;

    if (!isCompanyVerified) {
      throw new ForbiddenException({
        code: 'COMPANY_NOT_VERIFIED',
        message: 'Your company must be verified before submitting jobs for approval',
      });
    }

    const canTransition = canTransitionJob(
      job.status,
      JobStatus.PENDING_APPROVAL,
      UserRole.EMPLOYER,
      isCompanyVerified,
    );

    if (!canTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot submit job for approval from ${job.status} status`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const verifiedCompany = await tx.company.findFirst({
        where: {
          id: employer.companyId!,
          verificationStatus: VerificationStatus.VERIFIED,
        },
      });

      if (!verifiedCompany) {
        throw new ForbiddenException({
          code: 'COMPANY_NOT_VERIFIED',
          message: 'Your company must be verified before submitting jobs for approval',
        });
      }

      const updateResult = await tx.job.updateMany({
        where: {
          id: jobId,
          companyId: employer.companyId!,
          status: { in: [JobStatus.DRAFT, JobStatus.REJECTED] },
        },
        data: {
          status: JobStatus.PENDING_APPROVAL,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Job cannot be submitted for approval from its current status',
        });
      }

      const updated = await tx.job.findUniqueOrThrow({
        where: { id: jobId },
        include: {
          category: true,
          skills: { include: { skill: true } },
          company: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'JOB_SUBMITTED_FOR_APPROVAL',
          entity: 'Job',
          entityId: jobId,
          metadata: {
            previousStatus: job.status,
            newStatus: JobStatus.PENDING_APPROVAL,
          },
        },
      });

      const admins = await tx.user.findMany({
        where: { role: UserRole.ADMIN, status: 'ACTIVE' },
        select: { id: true },
      });

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            type: NotificationType.JOB_APPROVAL_REQUIRED,
            title: 'Job Approval Required',
            body: `Job "${job.title}" by "${employer.company!.name}" was submitted for review.`,
            data: {
              jobId: job.id,
              companyId: employer.companyId,
            },
          },
        });
      }

      return updated;
    });
  }

  async withdrawToDraft(employerUserId: string, jobId: string) {
    const employer = await this.getEmployerWithCompany(employerUserId);

    const job = await this.db.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        companyId: true,
        status: true,
      },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found',
      });
    }

    if (job.companyId !== employer.companyId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to modify this job',
      });
    }

    const canTransition = canTransitionJob(
      job.status,
      JobStatus.DRAFT,
      UserRole.EMPLOYER,
    );

    if (!canTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot withdraw job to draft from ${job.status} status`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const updateResult = await tx.job.updateMany({
        where: {
          id: jobId,
          companyId: employer.companyId!,
          status: JobStatus.PENDING_APPROVAL,
        },
        data: {
          status: JobStatus.DRAFT,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Job cannot be withdrawn to draft from current status',
        });
      }

      const updated = await tx.job.findUniqueOrThrow({
        where: { id: jobId },
        include: {
          category: true,
          skills: { include: { skill: true } },
          company: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'JOB_WITHDRAWN_TO_DRAFT',
          entity: 'Job',
          entityId: jobId,
          metadata: {
            previousStatus: job.status,
            newStatus: JobStatus.DRAFT,
          },
        },
      });

      return updated;
    });
  }

  async closeJob(employerUserId: string, jobId: string) {
    const employer = await this.getEmployerWithCompany(employerUserId);

    const job = await this.db.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        companyId: true,
        status: true,
      },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found',
      });
    }

    if (job.companyId !== employer.companyId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to close this job',
      });
    }

    const canTransition = canTransitionJob(
      job.status,
      JobStatus.CLOSED,
      UserRole.EMPLOYER,
    );

    if (!canTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot close job from ${job.status} status`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const updateResult = await tx.job.updateMany({
        where: {
          id: jobId,
          companyId: employer.companyId!,
          status: JobStatus.PUBLISHED,
        },
        data: {
          status: JobStatus.CLOSED,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Job cannot be closed from its current status',
        });
      }

      const updated = await tx.job.findUniqueOrThrow({
        where: { id: jobId },
        include: {
          category: true,
          skills: { include: { skill: true } },
          company: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'JOB_CLOSED',
          entity: 'Job',
          entityId: jobId,
          metadata: {
            previousStatus: job.status,
            newStatus: JobStatus.CLOSED,
          },
        },
      });

      return updated;
    });
  }

  async deleteDraft(employerUserId: string, jobId: string) {
    const employer = await this.getEmployerWithCompany(employerUserId);

    const job = await this.db.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        companyId: true,
        status: true,
      },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found',
      });
    }

    if (job.companyId !== employer.companyId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this job',
      });
    }

    if (job.status !== JobStatus.DRAFT) {
      throw new BadRequestException({
        code: 'CANNOT_DELETE_NON_DRAFT',
        message: 'Only draft jobs can be deleted',
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const deleteResult = await tx.job.deleteMany({
        where: {
          id: jobId,
          companyId: employer.companyId!,
          status: JobStatus.DRAFT,
        },
      });

      if (deleteResult.count === 0) {
        throw new BadRequestException({
          code: 'CANNOT_DELETE_NON_DRAFT',
          message: 'Only draft jobs can be deleted or job status has changed',
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'JOB_DELETED',
          entity: 'Job',
          entityId: jobId,
        },
      });

      return {
        success: true,
        message: 'Draft job deleted successfully',
      };
    });
  }

  async adminFindAll(query: QueryAdminJobsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { company: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.db.client.job.count({ where }),
      this.db.client.job.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          company: true,
          category: true,
          skills: {
            include: { skill: true },
          },
          _count: {
            select: { applications: true },
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

  async adminModerate(
    adminUserId: string,
    jobId: string,
    dto: ModerateJobDto,
  ) {
    const job = await this.db.client.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          include: {
            employers: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found',
      });
    }

    if (
      dto.status === JobStatus.REJECTED &&
      (!dto.reason || dto.reason.trim().length < 10)
    ) {
      throw new BadRequestException({
        code: 'REJECTION_REASON_REQUIRED',
        message: 'A rejection reason of at least 10 characters is required',
      });
    }

    const isValidTransition = canTransitionJob(
      job.status,
      dto.status,
      UserRole.ADMIN,
    );

    if (!isValidTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot moderate job from ${job.status} to ${dto.status}`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const updateResult = await tx.job.updateMany({
        where: {
          id: jobId,
          status: JobStatus.PENDING_APPROVAL,
        },
        data: {
          status: dto.status,
          publishedAt:
            dto.status === JobStatus.PUBLISHED
              ? new Date()
              : dto.status === JobStatus.REJECTED
                ? null
                : job.publishedAt,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Job status has changed or is no longer pending approval',
        });
      }

      const updated = await tx.job.findUniqueOrThrow({
        where: { id: jobId },
        include: {
          category: true,
          skills: { include: { skill: true } },
          company: true,
        },
      });

      const action =
        dto.status === JobStatus.PUBLISHED
          ? 'JOB_APPROVED'
          : dto.status === JobStatus.REJECTED
            ? 'JOB_REJECTED'
            : 'JOB_CLOSED';

      await tx.auditLog.create({
        data: {
          actorId: adminUserId,
          action,
          entity: 'Job',
          entityId: jobId,
          metadata: {
            previousStatus: job.status,
            newStatus: dto.status,
            reason: dto.reason ?? null,
          },
        },
      });

      if (dto.status === JobStatus.PUBLISHED || dto.status === JobStatus.REJECTED) {
        const notificationType =
          dto.status === JobStatus.PUBLISHED
            ? NotificationType.JOB_APPROVED
            : NotificationType.JOB_REJECTED;

        const notificationTitle =
          dto.status === JobStatus.PUBLISHED ? 'Job Approved' : 'Job Rejected';

        const notificationBody =
          dto.status === JobStatus.PUBLISHED
            ? `Your job "${job.title}" has been approved and is now published.`
            : `Your job "${job.title}" was rejected: ${dto.reason}`;

        for (const employer of job.company.employers) {
          await tx.notification.create({
            data: {
              userId: employer.userId,
              type: notificationType,
              title: notificationTitle,
              body: notificationBody,
              data: {
                jobId: job.id,
                companyId: job.companyId,
                status: dto.status,
                reason: dto.reason ?? null,
              },
            },
          });
        }
      }

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // Public Job Search & Inspection APIs (Task #87)
  // ---------------------------------------------------------------------------

  async searchPublicJobs(query: QueryPublicJobsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      status: JobStatus.PUBLISHED,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.workMode) {
      where.workMode = query.workMode;
    }

    if (query.location) {
      where.OR = [
        { location: { contains: query.location, mode: 'insensitive' } },
        { company: { location: { contains: query.location, mode: 'insensitive' } } },
      ];
    }

    if (query.skillIds?.length) {
      where.skills = {
        some: {
          skillId: { in: query.skillIds },
        },
      };
    }

    if (query.search) {
      const searchCondition = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { company: { name: { contains: query.search, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchCondition },
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const [total, data] = await Promise.all([
      this.db.client.job.count({ where }),
      this.db.client.job.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          company: {
            select: {
              id: true,
              name: true,
              location: true,
              website: true,
              verificationStatus: true,
            },
          },
          category: true,
          skills: {
            include: { skill: true },
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

  async getPublicJobById(id: string) {
    const job = await this.db.client.job.findFirst({
      where: {
        id,
        status: JobStatus.PUBLISHED,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            description: true,
            location: true,
            website: true,
            verificationStatus: true,
          },
        },
        category: true,
        skills: {
          include: { skill: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found or is not currently published',
      });
    }

    return job;
  }

  // ---------------------------------------------------------------------------
  // Student Saved Jobs APIs (Task #87)
  // ---------------------------------------------------------------------------

  private async getStudentProfile(studentUserId: string) {
    const student = await this.db.client.studentProfile.findUnique({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new NotFoundException({
        code: 'STUDENT_PROFILE_NOT_FOUND',
        message: 'Student profile does not exist for this account',
      });
    }

    return student;
  }

  async saveJob(studentUserId: string, jobId: string) {
    const student = await this.getStudentProfile(studentUserId);

    const job = await this.db.client.job.findFirst({
      where: {
        id: jobId,
        status: JobStatus.PUBLISHED,
      },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found or is not currently published',
      });
    }

    const existing = await this.db.client.savedJob.findUnique({
      where: {
        studentId_jobId: {
          studentId: student.id,
          jobId,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'JOB_ALREADY_SAVED',
        message: 'You have already saved this job',
      });
    }

    await this.db.client.savedJob.create({
      data: {
        studentId: student.id,
        jobId,
      },
    });

    return {
      success: true,
      message: 'Job saved successfully',
    };
  }

  async unsaveJob(studentUserId: string, jobId: string) {
    const student = await this.getStudentProfile(studentUserId);

    const existing = await this.db.client.savedJob.findUnique({
      where: {
        studentId_jobId: {
          studentId: student.id,
          jobId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'SAVED_JOB_NOT_FOUND',
        message: 'Job is not in your saved list',
      });
    }

    await this.db.client.savedJob.delete({
      where: {
        studentId_jobId: {
          studentId: student.id,
          jobId,
        },
      },
    });

    return {
      success: true,
      message: 'Job removed from saved list',
    };
  }

  async getSavedJobs(studentUserId: string, query: QuerySavedJobsDto) {
    const student = await this.getStudentProfile(studentUserId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = { studentId: student.id };

    const [total, savedRecords] = await Promise.all([
      this.db.client.savedJob.count({ where }),
      this.db.client.savedJob.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                  website: true,
                },
              },
              category: true,
              skills: {
                include: { skill: true },
              },
            },
          },
        },
      }),
    ]);

    const data = savedRecords.map((item) => ({
      savedAt: item.createdAt,
      ...item.job,
    }));

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

  async isJobSaved(studentUserId: string, jobId: string) {
    const student = await this.getStudentProfile(studentUserId);
    const saved = await this.db.client.savedJob.findUnique({
      where: {
        studentId_jobId: {
          studentId: student.id,
          jobId,
        },
      },
    });

    return { isSaved: !!saved };
  }
}
