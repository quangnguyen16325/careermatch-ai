import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  ApplicationStatus,
  InterviewStatus,
  NotificationType,
  UserRole,
} from '../generated/prisma/enums.js';
import {
  canTransitionInterview,
} from '../recruitment/recruitment-transitions.js';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto.js';
import { DeclineInterviewDto } from './dto/decline-interview.dto.js';
import { CancelInterviewDto } from './dto/cancel-interview.dto.js';

@Injectable()
export class InterviewsService {
  constructor(private readonly db: DatabaseService) {}

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

  async scheduleInterview(
    employerUserId: string,
    applicationId: string,
    dto: ScheduleInterviewDto,
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
        message: 'You do not have permission to schedule interviews for this application',
      });
    }

    if (
      application.status !== ApplicationStatus.SHORTLISTED &&
      application.status !== ApplicationStatus.INTERVIEW
    ) {
      throw new BadRequestException({
        code: 'INVALID_APPLICATION_STATUS_FOR_INTERVIEW',
        message:
          'Interviews can only be scheduled for applications in SHORTLISTED or INTERVIEW status',
      });
    }

    const scheduledDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException({
        code: 'INVALID_INTERVIEW_SCHEDULE',
        message: 'Invalid scheduledAt date format',
      });
    }

    // Must be at least 1 hour in the future (with 5 minute tolerance for latency)
    const minAllowedTime = Date.now() + 55 * 60 * 1000;
    if (scheduledDate.getTime() < minAllowedTime) {
      throw new BadRequestException({
        code: 'INVALID_INTERVIEW_SCHEDULE',
        message: 'Interview must be scheduled at least 1 hour in the future',
      });
    }

    if (dto.durationMin < 15 || dto.durationMin > 180) {
      throw new BadRequestException({
        code: 'INVALID_INTERVIEW_SCHEDULE',
        message: 'Interview duration must be between 15 and 180 minutes',
      });
    }

    const meetingUrl = dto.meetingUrl?.trim();
    const location = dto.location?.trim();

    if (!meetingUrl && !location) {
      throw new BadRequestException({
        code: 'LOCATION_OR_MEETING_URL_REQUIRED',
        message: 'At least one of meetingUrl or location must be provided',
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          applicationId,
          scheduledAt: scheduledDate,
          durationMin: dto.durationMin,
          meetingUrl: meetingUrl || null,
          location: location || null,
          notes: dto.notes?.trim() || null,
          status: InterviewStatus.PROPOSED,
        },
      });

      // Automatically transition SHORTLISTED -> INTERVIEW
      if (application.status === ApplicationStatus.SHORTLISTED) {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: ApplicationStatus.INTERVIEW,
            updatedAt: new Date(),
          },
        });

        await tx.applicationStatusHistory.create({
          data: {
            applicationId,
            fromStatus: ApplicationStatus.SHORTLISTED,
            toStatus: ApplicationStatus.INTERVIEW,
            reason: 'Interview invitation proposed.',
            changedById: employerUserId,
          },
        });
      }

      // Dispatch INTERVIEW_INVITATION notification to student
      await tx.notification.create({
        data: {
          userId: application.student.userId,
          type: NotificationType.INTERVIEW_INVITATION,
          title: 'Interview Invitation',
          body: `${application.job.company.name} invited you to an interview for ${application.job.title}.`,
          data: {
            jobId: application.job.id,
            applicationId: application.id,
            interviewId: interview.id,
            scheduledAt: scheduledDate.toISOString(),
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: employerUserId,
          action: 'INTERVIEW_PROPOSED',
          entity: 'Interview',
          entityId: interview.id,
          metadata: {
            applicationId,
            scheduledAt: scheduledDate.toISOString(),
            durationMin: dto.durationMin,
            hasMeetingUrl: Boolean(meetingUrl),
            hasLocation: Boolean(location),
          },
        },
      });

      return interview;
    });
  }

  async acceptInterview(studentUserId: string, interviewId: string) {
    const interview = await this.db.client.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            student: true,
            job: {
              include: {
                company: {
                  include: {
                    employers: { select: { userId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException({
        code: 'INTERVIEW_NOT_FOUND',
        message: 'Interview not found',
      });
    }

    if (interview.application.student.userId !== studentUserId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to respond to this interview invitation',
      });
    }

    const isValidTransition = canTransitionInterview(
      interview.status,
      InterviewStatus.ACCEPTED,
      UserRole.STUDENT,
    );

    if (!isValidTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot accept interview with status ${interview.status}`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const updateResult = await tx.interview.updateMany({
        where: {
          id: interviewId,
          status: InterviewStatus.PROPOSED,
        },
        data: {
          status: InterviewStatus.ACCEPTED,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Interview status has changed or cannot be accepted',
        });
      }

      // Notify company employers
      const employerUserIds = interview.application.job.company.employers.map(
        (e) => e.userId,
      );
      for (const employerUserId of employerUserIds) {
        await tx.notification.create({
          data: {
            userId: employerUserId,
            type: NotificationType.INTERVIEW_CONFIRMED,
            title: 'Interview Confirmed',
            body: `${interview.application.student.fullName} confirmed the interview for ${interview.application.job.title}.`,
            data: {
              interviewId: interview.id,
              applicationId: interview.application.id,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: studentUserId,
          action: 'INTERVIEW_ACCEPTED',
          entity: 'Interview',
          entityId: interview.id,
          metadata: {
            previousStatus: InterviewStatus.PROPOSED,
            newStatus: InterviewStatus.ACCEPTED,
          },
        },
      });

      return tx.interview.findUniqueOrThrow({
        where: { id: interviewId },
        include: {
          application: {
            include: {
              job: true,
              student: true,
            },
          },
        },
      });
    });
  }

  async declineInterview(
    studentUserId: string,
    interviewId: string,
    dto?: DeclineInterviewDto,
  ) {
    const interview = await this.db.client.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            student: true,
            job: {
              include: {
                company: {
                  include: {
                    employers: { select: { userId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException({
        code: 'INTERVIEW_NOT_FOUND',
        message: 'Interview not found',
      });
    }

    if (interview.application.student.userId !== studentUserId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to respond to this interview invitation',
      });
    }

    const isValidTransition = canTransitionInterview(
      interview.status,
      InterviewStatus.DECLINED,
      UserRole.STUDENT,
    );

    if (!isValidTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot decline interview with status ${interview.status}`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const reason = dto?.reason?.trim();
      const notes = reason
        ? interview.notes
          ? `${interview.notes}\n[Declined by candidate]: ${reason}`
          : `[Declined by candidate]: ${reason}`
        : interview.notes;

      const updateResult = await tx.interview.updateMany({
        where: {
          id: interviewId,
          status: InterviewStatus.PROPOSED,
        },
        data: {
          status: InterviewStatus.DECLINED,
          notes,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Interview status has changed or cannot be declined',
        });
      }

      // Notify company employers
      const employerUserIds = interview.application.job.company.employers.map(
        (e) => e.userId,
      );
      for (const employerUserId of employerUserIds) {
        await tx.notification.create({
          data: {
            userId: employerUserId,
            type: NotificationType.INTERVIEW_DECLINED,
            title: 'Interview Declined',
            body: `${interview.application.student.fullName} declined the interview invitation for ${interview.application.job.title}.`,
            data: {
              interviewId: interview.id,
              applicationId: interview.application.id,
              reason: reason ?? null,
            },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: studentUserId,
          action: 'INTERVIEW_DECLINED',
          entity: 'Interview',
          entityId: interview.id,
          metadata: {
            previousStatus: InterviewStatus.PROPOSED,
            newStatus: InterviewStatus.DECLINED,
            reason: reason ?? null,
          },
        },
      });

      return tx.interview.findUniqueOrThrow({
        where: { id: interviewId },
        include: {
          application: {
            include: {
              job: true,
              student: true,
            },
          },
        },
      });
    });
  }

  async cancelInterview(
    userId: string,
    interviewId: string,
    dto?: CancelInterviewDto,
    userRole: UserRole = UserRole.EMPLOYER,
  ) {
    let employerCompanyId: string | undefined;
    if (userRole === UserRole.EMPLOYER) {
      const employer = await this.getEmployerProfile(userId);
      employerCompanyId = employer.companyId!;
    }

    const interview = await this.db.client.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            student: true,
            job: {
              include: {
                company: true,
              },
            },
          },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException({
        code: 'INTERVIEW_NOT_FOUND',
        message: 'Interview not found',
      });
    }

    if (
      userRole === UserRole.EMPLOYER &&
      interview.application.job.companyId !== employerCompanyId
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to cancel this interview',
      });
    }

    const isValidTransition = canTransitionInterview(
      interview.status,
      InterviewStatus.CANCELLED,
      userRole,
    );

    if (!isValidTransition) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot cancel interview with status ${interview.status}`,
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const reason = dto?.reason?.trim();
      const notes = reason
        ? interview.notes
          ? `${interview.notes}\n[Cancelled by employer]: ${reason}`
          : `[Cancelled by employer]: ${reason}`
        : interview.notes;

      const updateResult = await tx.interview.updateMany({
        where: {
          id: interviewId,
          status: {
            in: [InterviewStatus.PROPOSED, InterviewStatus.ACCEPTED],
          },
        },
        data: {
          status: InterviewStatus.CANCELLED,
          notes,
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Interview status has changed or cannot be cancelled',
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'INTERVIEW_CANCELLED',
          entity: 'Interview',
          entityId: interview.id,
          metadata: {
            previousStatus: interview.status,
            newStatus: InterviewStatus.CANCELLED,
            reason: reason ?? null,
          },
        },
      });

      return tx.interview.findUniqueOrThrow({
        where: { id: interviewId },
        include: {
          application: {
            include: {
              job: true,
              student: true,
            },
          },
        },
      });
    });
  }

  async getInterviewsByApplication(
    userId: string,
    applicationId: string,
    userRole: UserRole,
  ) {
    const application = await this.db.client.application.findUnique({
      where: { id: applicationId },
      include: {
        student: true,
        job: {
          include: {
            company: {
              include: {
                employers: { select: { userId: true } },
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

    if (userRole === UserRole.STUDENT) {
      if (application.student.userId !== userId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view interviews for this application',
        });
      }
    } else if (userRole === UserRole.EMPLOYER) {
      const isOwnerEmployer = application.job.company.employers.some(
        (e) => e.userId === userId,
      );
      if (!isOwnerEmployer) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view interviews for this application',
        });
      }
    }

    return this.db.client.interview.findMany({
      where: { applicationId },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getInterviewById(
    userId: string,
    interviewId: string,
    userRole: UserRole,
  ) {
    const interview = await this.db.client.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            student: true,
            job: {
              include: {
                company: {
                  include: {
                    employers: { select: { userId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException({
        code: 'INTERVIEW_NOT_FOUND',
        message: 'Interview not found',
      });
    }

    if (userRole === UserRole.STUDENT) {
      if (interview.application.student.userId !== userId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this interview',
        });
      }
    } else if (userRole === UserRole.EMPLOYER) {
      const isOwnerEmployer = interview.application.job.company.employers.some(
        (e) => e.userId === userId,
      );
      if (!isOwnerEmployer) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this interview',
        });
      }
    }

    return interview;
  }
}
