import { describe, it, expect } from 'vitest';
import {
  ApplicationStatus,
  JobStatus,
  InterviewStatus,
  VerificationStatus,
  UserRole,
} from '../src/generated/prisma/enums.js';
import {
  canTransitionApplication,
  validateApplicationTransition,
  InvalidStateTransitionError,
  canTransitionJob,
  canTransitionInterview,
  canTransitionCompanyVerification,
} from '../src/recruitment/recruitment-transitions.js';

describe('Recruitment State Transitions (CM-081)', () => {
  describe('Application State Machine', () => {
    it('allows valid employer progression from SUBMITTED to ACCEPTED', () => {
      expect(
        canTransitionApplication(
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.REVIEWING,
          UserRole.EMPLOYER,
        ),
      ).toBe(true);

      expect(
        canTransitionApplication(
          ApplicationStatus.REVIEWING,
          ApplicationStatus.SHORTLISTED,
          UserRole.EMPLOYER,
        ),
      ).toBe(true);

      expect(
        canTransitionApplication(
          ApplicationStatus.SHORTLISTED,
          ApplicationStatus.INTERVIEW,
          UserRole.EMPLOYER,
        ),
      ).toBe(true);

      expect(
        canTransitionApplication(
          ApplicationStatus.INTERVIEW,
          ApplicationStatus.ACCEPTED,
          UserRole.EMPLOYER,
        ),
      ).toBe(true);
    });

    it('allows employer to reject candidates from any non-terminal state', () => {
      const nonTerminalStates = [
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.REVIEWING,
        ApplicationStatus.SHORTLISTED,
        ApplicationStatus.INTERVIEW,
      ];

      for (const state of nonTerminalStates) {
        expect(
          canTransitionApplication(
            state,
            ApplicationStatus.REJECTED,
            UserRole.EMPLOYER,
          ),
        ).toBe(true);
      }
    });

    it('allows student to withdraw prior to interview stage', () => {
      expect(
        canTransitionApplication(
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.WITHDRAWN,
          UserRole.STUDENT,
        ),
      ).toBe(true);

      expect(
        canTransitionApplication(
          ApplicationStatus.REVIEWING,
          ApplicationStatus.WITHDRAWN,
          UserRole.STUDENT,
        ),
      ).toBe(true);

      expect(
        canTransitionApplication(
          ApplicationStatus.SHORTLISTED,
          ApplicationStatus.WITHDRAWN,
          UserRole.STUDENT,
        ),
      ).toBe(true);

      // Student cannot directly withdraw during active interview stage
      expect(
        canTransitionApplication(
          ApplicationStatus.INTERVIEW,
          ApplicationStatus.WITHDRAWN,
          UserRole.STUDENT,
        ),
      ).toBe(false);
    });

    it('forbids student from accepting or shortlisting themselves', () => {
      expect(
        canTransitionApplication(
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.ACCEPTED,
          UserRole.STUDENT,
        ),
      ).toBe(false);

      expect(
        canTransitionApplication(
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.SHORTLISTED,
          UserRole.STUDENT,
        ),
      ).toBe(false);
    });

    it('locks terminal states (ACCEPTED, REJECTED, WITHDRAWN) from any further mutation', () => {
      const terminalStates = [
        ApplicationStatus.ACCEPTED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
      ];
      const allStates = Object.values(ApplicationStatus);

      for (const terminal of terminalStates) {
        for (const target of allStates) {
          expect(
            canTransitionApplication(terminal, target, UserRole.EMPLOYER),
          ).toBe(false);
          expect(
            canTransitionApplication(terminal, target, UserRole.STUDENT),
          ).toBe(false);
        }
      }
    });

    it('throws InvalidStateTransitionError on invalid transition', () => {
      expect(() =>
        validateApplicationTransition(
          ApplicationStatus.REJECTED,
          ApplicationStatus.ACCEPTED,
          UserRole.EMPLOYER,
        ),
      ).toThrow(InvalidStateTransitionError);
    });
  });

  describe('Job Posting State Machine', () => {
    it('requires company verification before submitting job for approval', () => {
      // Unverified company -> forbidden
      expect(
        canTransitionJob(
          JobStatus.DRAFT,
          JobStatus.PENDING_APPROVAL,
          UserRole.EMPLOYER,
          false,
        ),
      ).toBe(false);

      // Verified company -> allowed
      expect(
        canTransitionJob(
          JobStatus.DRAFT,
          JobStatus.PENDING_APPROVAL,
          UserRole.EMPLOYER,
          true,
        ),
      ).toBe(true);
    });

    it('allows Admin to approve or reject pending jobs', () => {
      expect(
        canTransitionJob(
          JobStatus.PENDING_APPROVAL,
          JobStatus.PUBLISHED,
          UserRole.ADMIN,
        ),
      ).toBe(true);

      expect(
        canTransitionJob(
          JobStatus.PENDING_APPROVAL,
          JobStatus.REJECTED,
          UserRole.ADMIN,
        ),
      ).toBe(true);
    });

    it('allows employer to revert rejected job back to draft for editing', () => {
      expect(
        canTransitionJob(
          JobStatus.REJECTED,
          JobStatus.DRAFT,
          UserRole.EMPLOYER,
        ),
      ).toBe(true);
    });

    it('prevents reopening a closed job', () => {
      expect(
        canTransitionJob(
          JobStatus.CLOSED,
          JobStatus.PUBLISHED,
          UserRole.EMPLOYER,
        ),
      ).toBe(false);

      expect(
        canTransitionJob(
          JobStatus.CLOSED,
          JobStatus.DRAFT,
          UserRole.EMPLOYER,
        ),
      ).toBe(false);
    });
  });

  describe('Interview Lifecycle', () => {
    it('allows student to accept or decline proposed interview', () => {
      expect(
        canTransitionInterview(
          InterviewStatus.PROPOSED,
          InterviewStatus.ACCEPTED,
          UserRole.STUDENT,
        ),
      ).toBe(true);

      expect(
        canTransitionInterview(
          InterviewStatus.PROPOSED,
          InterviewStatus.DECLINED,
          UserRole.STUDENT,
        ),
      ).toBe(true);
    });

    it('allows employer to cancel or complete interviews', () => {
      expect(
        canTransitionInterview(
          InterviewStatus.PROPOSED,
          InterviewStatus.CANCELLED,
          UserRole.EMPLOYER,
        ),
      ).toBe(true);

      expect(
        canTransitionInterview(
          InterviewStatus.ACCEPTED,
          InterviewStatus.COMPLETED,
          UserRole.EMPLOYER,
        ),
      ).toBe(true);
    });

    it('forbids student from marking interview as completed or cancelled', () => {
      expect(
        canTransitionInterview(
          InterviewStatus.ACCEPTED,
          InterviewStatus.COMPLETED,
          UserRole.STUDENT,
        ),
      ).toBe(false);

      expect(
        canTransitionInterview(
          InterviewStatus.ACCEPTED,
          InterviewStatus.CANCELLED,
          UserRole.STUDENT,
        ),
      ).toBe(false);
    });
  });

  describe('Company Verification Lifecycle', () => {
    it('allows Admin to verify or reject pending company', () => {
      expect(
        canTransitionCompanyVerification(
          VerificationStatus.PENDING,
          VerificationStatus.VERIFIED,
          UserRole.ADMIN,
        ),
      ).toBe(true);

      expect(
        canTransitionCompanyVerification(
          VerificationStatus.PENDING,
          VerificationStatus.REJECTED,
          UserRole.ADMIN,
        ),
      ).toBe(true);
    });

    it('forbids employer from verifying themselves', () => {
      expect(
        canTransitionCompanyVerification(
          VerificationStatus.PENDING,
          VerificationStatus.VERIFIED,
          UserRole.EMPLOYER,
        ),
      ).toBe(false);
    });

    it('allows employer to resubmit rejected company to pending', () => {
      expect(
        canTransitionCompanyVerification(
          VerificationStatus.REJECTED,
          VerificationStatus.PENDING,
          UserRole.EMPLOYER,
        ),
      ).toBe(true);
    });
  });
});
