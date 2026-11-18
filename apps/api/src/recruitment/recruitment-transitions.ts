import {
  ApplicationStatus,
  JobStatus,
  InterviewStatus,
  VerificationStatus,
  UserRole,
} from '../generated/prisma/enums.js';

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly entity: string,
    public readonly from: string,
    public readonly to: string,
    public readonly role: string,
  ) {
    super(`Cannot transition ${entity} from ${from} to ${to} by ${role}`);
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Valid allowed transitions for ApplicationStatus based on actor role
 */
export const ALLOWED_APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  Partial<Record<UserRole, ApplicationStatus[]>>
> = {
  [ApplicationStatus.SUBMITTED]: {
    [UserRole.EMPLOYER]: [
      ApplicationStatus.REVIEWING,
      ApplicationStatus.SHORTLISTED,
      ApplicationStatus.REJECTED,
    ],
    [UserRole.STUDENT]: [ApplicationStatus.WITHDRAWN],
  },
  [ApplicationStatus.REVIEWING]: {
    [UserRole.EMPLOYER]: [
      ApplicationStatus.SHORTLISTED,
      ApplicationStatus.REJECTED,
    ],
    [UserRole.STUDENT]: [ApplicationStatus.WITHDRAWN],
  },
  [ApplicationStatus.SHORTLISTED]: {
    [UserRole.EMPLOYER]: [
      ApplicationStatus.INTERVIEW,
      ApplicationStatus.REJECTED,
    ],
    [UserRole.STUDENT]: [ApplicationStatus.WITHDRAWN],
  },
  [ApplicationStatus.INTERVIEW]: {
    [UserRole.EMPLOYER]: [
      ApplicationStatus.ACCEPTED,
      ApplicationStatus.REJECTED,
    ],
    // In INTERVIEW, student must cancel/decline interview before withdrawing
    [UserRole.STUDENT]: [],
  },
  // Terminal states cannot transition to anything
  [ApplicationStatus.ACCEPTED]: {},
  [ApplicationStatus.REJECTED]: {},
  [ApplicationStatus.WITHDRAWN]: {},
};

export function canTransitionApplication(
  from: ApplicationStatus,
  to: ApplicationStatus,
  role: UserRole,
): boolean {
  if (role === UserRole.ADMIN) {
    // Admins can force change in moderation/escalation contexts
    return true;
  }
  const allowed = ALLOWED_APPLICATION_TRANSITIONS[from]?.[role] ?? [];
  return allowed.includes(to);
}

export function validateApplicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  role: UserRole,
): void {
  if (!canTransitionApplication(from, to, role)) {
    throw new InvalidStateTransitionError('Application', from, to, role);
  }
}

/**
 * Valid allowed transitions for JobStatus
 */
export const ALLOWED_JOB_TRANSITIONS: Record<
  JobStatus,
  Partial<Record<UserRole, JobStatus[]>>
> = {
  [JobStatus.DRAFT]: {
    [UserRole.EMPLOYER]: [JobStatus.PENDING_APPROVAL],
    [UserRole.ADMIN]: [],
  },
  [JobStatus.PENDING_APPROVAL]: {
    [UserRole.EMPLOYER]: [JobStatus.DRAFT], // Employer can withdraw to draft
    [UserRole.ADMIN]: [JobStatus.PUBLISHED, JobStatus.REJECTED],
  },
  [JobStatus.PUBLISHED]: {
    [UserRole.EMPLOYER]: [JobStatus.CLOSED],
    [UserRole.ADMIN]: [JobStatus.CLOSED, JobStatus.REJECTED],
  },
  [JobStatus.REJECTED]: {
    [UserRole.EMPLOYER]: [JobStatus.DRAFT], // Revert to draft for editing
    [UserRole.ADMIN]: [],
  },
  [JobStatus.CLOSED]: {
    [UserRole.EMPLOYER]: [], // Closed jobs cannot be reopened directly
    [UserRole.ADMIN]: [],
  },
};

export function canTransitionJob(
  from: JobStatus,
  to: JobStatus,
  role: UserRole,
  isCompanyVerified = true,
): boolean {
  // Employer submitting draft to pending approval requires verified company
  if (
    role === UserRole.EMPLOYER &&
    from === JobStatus.DRAFT &&
    to === JobStatus.PENDING_APPROVAL &&
    !isCompanyVerified
  ) {
    return false;
  }
  const allowed = ALLOWED_JOB_TRANSITIONS[from]?.[role] ?? [];
  return allowed.includes(to);
}

/**
 * Valid allowed transitions for InterviewStatus
 */
export const ALLOWED_INTERVIEW_TRANSITIONS: Record<
  InterviewStatus,
  Partial<Record<UserRole, InterviewStatus[]>>
> = {
  [InterviewStatus.PROPOSED]: {
    [UserRole.STUDENT]: [InterviewStatus.ACCEPTED, InterviewStatus.DECLINED],
    [UserRole.EMPLOYER]: [InterviewStatus.CANCELLED],
    [UserRole.ADMIN]: [InterviewStatus.CANCELLED],
  },
  [InterviewStatus.ACCEPTED]: {
    [UserRole.STUDENT]: [],
    [UserRole.EMPLOYER]: [InterviewStatus.COMPLETED, InterviewStatus.CANCELLED],
    [UserRole.ADMIN]: [InterviewStatus.CANCELLED],
  },
  [InterviewStatus.DECLINED]: {},
  [InterviewStatus.COMPLETED]: {},
  [InterviewStatus.CANCELLED]: {},
};

export function canTransitionInterview(
  from: InterviewStatus,
  to: InterviewStatus,
  role: UserRole,
): boolean {
  const allowed = ALLOWED_INTERVIEW_TRANSITIONS[from]?.[role] ?? [];
  return allowed.includes(to);
}

/**
 * Valid allowed transitions for Company VerificationStatus
 */
export const ALLOWED_VERIFICATION_TRANSITIONS: Record<
  VerificationStatus,
  Partial<Record<UserRole, VerificationStatus[]>>
> = {
  [VerificationStatus.PENDING]: {
    [UserRole.ADMIN]: [VerificationStatus.VERIFIED, VerificationStatus.REJECTED],
    [UserRole.EMPLOYER]: [],
  },
  [VerificationStatus.VERIFIED]: {
    [UserRole.ADMIN]: [VerificationStatus.REJECTED], // Revoke verification
    [UserRole.EMPLOYER]: [],
  },
  [VerificationStatus.REJECTED]: {
    [UserRole.ADMIN]: [VerificationStatus.VERIFIED],
    [UserRole.EMPLOYER]: [VerificationStatus.PENDING], // Resubmit documents
  },
};

export function canTransitionCompanyVerification(
  from: VerificationStatus,
  to: VerificationStatus,
  role: UserRole,
): boolean {
  const allowed = ALLOWED_VERIFICATION_TRANSITIONS[from]?.[role] ?? [];
  return allowed.includes(to);
}
