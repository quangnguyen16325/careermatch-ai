import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  ApplicationStatus,
  JobStatus,
  NotificationType,
  UserRole,
} from '../generated/prisma/enums.js';
import { canTransitionApplication } from '../recruitment/recruitment-transitions.js';
import { ApplyJobDto } from './dto/apply-job.dto.js';
import { WithdrawApplicationDto } from './dto/withdraw-application.dto.js';
import { QueryMyApplicationsDto } from './dto/query-applications.dto.js';
import { QueryJobApplicationsDto } from './dto/query-job-applications.dto.js';
import { ShortlistCandidateDto } from './dto/shortlist-candidate.dto.js';
import { ReviewCandidateDto } from './dto/review-candidate.dto.js';

@Injectable()
export class ApplicationsService {
  constructor(private readonly db: DatabaseService) {}

  private async getStudentProfile(userId: string) {
    const student = await this.db.client.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      throw new NotFoundException({
        code: 'STUDENT_PROFILE_NOT_FOUND',
        message: 'Student profile does not exist for this account',
      });
    }

    return student;
  }

  private async getEmployerProfile(userId: string) {
    const employer = await this.db.client.employerProfile.findUnique({
      where: { userId },
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
        message: 'You must be associated with a company to perform this action',
      });
    }

    return employer;
  }

  async applyForJob(studentUserId: string, jobId: string, dto: ApplyJobDto) {
    const student = await this.getStudentProfile(studentUserId);

    const job = await this.db.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        companyId: true,
        status: true,
        company: {
          select: {
            id: true,
            name: true,
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

    if (job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException({
        code: 'JOB_NOT_ACCEPTING_APPLICATIONS',
        message: 'Job is not accepting applications',
      });
    }

    const existing = await this.db.client.application.findUnique({
      where: {
        studentId_jobId: {
          studentId: student.id,
          jobId,
        },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'APPLICATION_ALREADY_EXISTS',
        message: 'You have already submitted an application for this job',
      });
    }

    try {
      return await this.db.client.$transaction(async (tx) => {
        const application = await tx.application.create({
          data: {
            studentId: student.id,
            jobId,
            status: ApplicationStatus.SUBMITTED,
            coverLetter: dto.coverLetter ?? null,
          },
          include: {
            job: {
              include: {
                company: true,
                category: true,
                skills: { include: { skill: true } },
              },
            },
            student: true,
          },
        });

        await tx.applicationStatusHistory.create({
          data: {
            applicationId: application.id,
            fromStatus: null,
            toStatus: ApplicationStatus.SUBMITTED,
            changedById: studentUserId,
            reason: 'Candidate submitted initial application.',
          },
        });

        const employerUserIds = job.company.employers.map((e) => e.userId);
        for (const employerUserId of employerUserIds) {
          await tx.notification.create({
            data: {
              userId: employerUserId,
              type: NotificationType.NEW_APPLICATION,
              title: 'New Application Received',
              body: `${student.fullName} submitted an application for ${job.title}.`,
              data: {
                jobId: job.id,
                applicationId: application.id,
                studentId: student.id,
                applicantName: student.fullName,
              },
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: studentUserId,
            action: 'APPLICATION_SUBMITTED',
            entity: 'Application',
            entityId: application.id,
            metadata: {
              jobId: job.id,
              jobTitle: job.title,
            },
          },
        });

        return application;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'APPLICATION_ALREADY_EXISTS',
          message: 'You have already submitted an application for this job',
        });
      }
      throw error;
    }
  }

  async withdrawApplication(
    studentUserId: string,
    applicationId: string,
    dto: WithdrawApplicationDto,
  ) {
    const student = await this.getStudentProfile(studentUserId);

    const application = await this.db.client.application.findUnique({
      where: { id: applicationId },
      include: {
        student: true,
        job: {
          include: {
            company: {
              include: {
                employers: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    }

    if (application.studentId !== student.id) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to withdraw this application',
      });
    }

    if (application.status === ApplicationStatus.INTERVIEW) {
      throw new BadRequestException({
        code: 'CANNOT_WITHDRAW_ACTIVE_INTERVIEW',
        message:
          'Applications with active or scheduled interviews cannot be withdrawn directly. Please decline or cancel the interview first.',
      });
    }

    const isValidTransition = canTransitionApplication(
      application.status,
      ApplicationStatus.WITHDRAWN,
      UserRole.STUDENT,
    );

    if (!isValidTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot withdraw application from ${application.status} status`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      // Atomic conditional update
      const updateResult = await tx.application.updateMany({
        where: {
          id: applicationId,
          studentId: student.id,
          status: {
            in: [
              ApplicationStatus.SUBMITTED,
              ApplicationStatus.REVIEWING,
              ApplicationStatus.SHORTLISTED,
            ],
          },
        },
        data: {
          status: ApplicationStatus.WITHDRAWN,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Application status has changed or cannot be withdrawn',
        });
      }

      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: ApplicationStatus.WITHDRAWN,
          reason: dto.reason ?? 'Withdrawn by student.',
          changedById: studentUserId,
        },
      });

      const updated = await tx.application.findUniqueOrThrow({
        where: { id: applicationId },
        include: {
          job: {
            include: {
              company: true,
              category: true,
              skills: { include: { skill: true } },
            },
          },
          student: true,
          history: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const employerUserIds = application.job.company.employers.map(
        (e) => e.userId,
      );
      for (const employerUserId of employerUserIds) {
        await tx.notification.create({
          data: {
            userId: employerUserId,
            type: NotificationType.APPLICATION_WITHDRAWN,
            title: 'Application Withdrawn',
            body: `${student.fullName} has withdrawn their application for ${application.job.title}.`,
            data: {
              jobId: application.job.id,
              applicationId,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: studentUserId,
          action: 'APPLICATION_WITHDRAWN',
          entity: 'Application',
          entityId: applicationId,
          metadata: {
            previousStatus: application.status,
            newStatus: ApplicationStatus.WITHDRAWN,
            reason: dto.reason ?? null,
          },
        },
      });

      return updated;
    });
  }

  async getMyApplications(
    studentUserId: string,
    query: QueryMyApplicationsDto,
  ) {
    const student = await this.getStudentProfile(studentUserId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      studentId: student.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [total, data] = await Promise.all([
      this.db.client.application.count({ where }),
      this.db.client.application.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { submittedAt: 'desc' },
        include: {
          job: {
            include: {
              company: true,
              category: true,
            },
          },
          history: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          interviews: {
            orderBy: { scheduledAt: 'desc' },
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

  async getApplicationById(
    userId: string,
    applicationId: string,
    userRole: UserRole,
  ) {
    const application = await this.db.client.application.findUnique({
      where: { id: applicationId },
      include: {
        student: {
          include: {
            user: {
              select: { id: true, email: true },
            },
            skills: { include: { skill: true } },
            cvs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        job: {
          include: {
            company: {
              include: {
                employers: { select: { userId: true } },
              },
            },
            category: true,
            skills: { include: { skill: true } },
          },
        },
        history: {
          orderBy: { createdAt: 'asc' },
        },
        interviews: {
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    if (!application) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    }

    // Role-based access control
    if (userRole === UserRole.STUDENT) {
      if (application.student.userId !== userId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this application',
        });
      }
    } else if (userRole === UserRole.EMPLOYER) {
      const isOwnerEmployer = application.job.company.employers.some(
        (e) => e.userId === userId,
      );
      if (!isOwnerEmployer) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this application',
        });
      }
    }

    return application;
  }

  async getEmployerApplications(
    employerUserId: string,
    query: QueryJobApplicationsDto,
    userRole: UserRole = UserRole.EMPLOYER,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ApplicationWhereInput = {};

    if (userRole === UserRole.EMPLOYER) {
      const employer = await this.getEmployerProfile(employerUserId);
      where.job = {
        companyId: employer.companyId!,
      };

      if (query.jobId) {
        const job = await this.db.client.job.findUnique({
          where: { id: query.jobId },
          select: { companyId: true },
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
            message: 'You do not have permission to view applicants for this job',
          });
        }

        where.jobId = query.jobId;
      }
    } else if (query.jobId) {
      where.jobId = query.jobId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const search = query.search;
      where.student = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const [total, data] = await Promise.all([
      this.db.client.application.count({ where }),
      this.db.client.application.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { submittedAt: 'desc' },
        include: {
          student: {
            include: {
              user: {
                select: { id: true, email: true },
              },
              skills: { include: { skill: true } },
              cvs: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          job: {
            include: {
              company: true,
              category: true,
            },
          },
          history: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          interviews: {
            orderBy: { scheduledAt: 'desc' },
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

  async getJobApplications(
    employerUserId: string,
    jobId: string,
    query: QueryJobApplicationsDto,
    userRole: UserRole = UserRole.EMPLOYER,
  ) {
    const combinedQuery = new QueryJobApplicationsDto();
    combinedQuery.page = query.page;
    combinedQuery.pageSize = query.pageSize;
    combinedQuery.status = query.status;
    combinedQuery.search = query.search;
    combinedQuery.jobId = jobId;

    return this.getEmployerApplications(
      employerUserId,
      combinedQuery,
      userRole,
    );
  }

  async reviewApplication(
    employerUserId: string,
    applicationId: string,
    dto?: ReviewCandidateDto,
    userRole: UserRole = UserRole.EMPLOYER,
  ) {
    let employerCompanyId: string | undefined;
    if (userRole === UserRole.EMPLOYER) {
      const employer = await this.getEmployerProfile(employerUserId);
      employerCompanyId = employer.companyId!;
    }

    const application = await this.db.client.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            company: {
              include: {
                employers: { select: { userId: true } },
              },
            },
          },
        },
        student: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    }

    if (
      userRole === UserRole.EMPLOYER &&
      application.job.companyId !== employerCompanyId
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to review this application',
      });
    }

    if (application.status === ApplicationStatus.REVIEWING) {
      return application;
    }

    const isValidTransition = canTransitionApplication(
      application.status,
      ApplicationStatus.REVIEWING,
      userRole,
    );

    if (!isValidTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot transition application from ${application.status} to REVIEWING`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const updateResult = await tx.application.updateMany({
        where: {
          id: applicationId,
          status: ApplicationStatus.SUBMITTED,
        },
        data: {
          status: ApplicationStatus.REVIEWING,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Application status has changed or cannot be reviewed',
        });
      }

      const reason = dto?.note ?? 'Employer started reviewing candidate profile.';
      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: ApplicationStatus.REVIEWING,
          reason,
          changedById: employerUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'APPLICATION_REVIEWED',
          entity: 'Application',
          entityId: applicationId,
          metadata: {
            previousStatus: application.status,
            newStatus: ApplicationStatus.REVIEWING,
            note: dto?.note ?? null,
          },
        },
      });

      return tx.application.findUniqueOrThrow({
        where: { id: applicationId },
        include: {
          job: {
            include: {
              company: true,
              category: true,
              skills: { include: { skill: true } },
            },
          },
          student: true,
          history: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });
  }

  async shortlistApplication(
    employerUserId: string,
    applicationId: string,
    dto?: ShortlistCandidateDto,
    userRole: UserRole = UserRole.EMPLOYER,
  ) {
    let employerCompanyId: string | undefined;
    if (userRole === UserRole.EMPLOYER) {
      const employer = await this.getEmployerProfile(employerUserId);
      employerCompanyId = employer.companyId!;
    }

    const application = await this.db.client.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            company: {
              include: {
                employers: { select: { userId: true } },
              },
            },
          },
        },
        student: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    }

    if (
      userRole === UserRole.EMPLOYER &&
      application.job.companyId !== employerCompanyId
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to shortlist this candidate',
      });
    }

    const isValidTransition = canTransitionApplication(
      application.status,
      ApplicationStatus.SHORTLISTED,
      userRole,
    );

    if (!isValidTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot shortlist candidate from ${application.status} status`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const updateResult = await tx.application.updateMany({
        where: {
          id: applicationId,
          status: {
            in: [ApplicationStatus.SUBMITTED, ApplicationStatus.REVIEWING],
          },
        },
        data: {
          status: ApplicationStatus.SHORTLISTED,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Application status has changed or cannot be shortlisted',
        });
      }

      const reason =
        dto?.note ??
        dto?.reason ??
        'Candidate profile shortlisted for interview consideration.';

      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: ApplicationStatus.SHORTLISTED,
          reason,
          changedById: employerUserId,
        },
      });

      await tx.notification.create({
        data: {
          userId: application.student.userId,
          type: NotificationType.APPLICATION_SHORTLISTED,
          title: 'Application Shortlisted',
          body: `${application.job.company.name} has shortlisted your application for ${application.job.title}.`,
          data: {
            jobId: application.job.id,
            applicationId: application.id,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'APPLICATION_SHORTLISTED',
          entity: 'Application',
          entityId: applicationId,
          metadata: {
            previousStatus: application.status,
            newStatus: ApplicationStatus.SHORTLISTED,
            reason,
          },
        },
      });

      return tx.application.findUniqueOrThrow({
        where: { id: applicationId },
        include: {
          job: {
            include: {
              company: true,
              category: true,
              skills: { include: { skill: true } },
            },
          },
          student: true,
          history: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });
  }
}
