import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ApplicationInterviewsController,
  InterviewsController,
} from './interviews.controller.js';
import { InterviewsService } from './interviews.service.js';
import { InterviewStatus, UserRole } from '../generated/prisma/enums.js';

describe('InterviewsControllers', () => {
  let appController: ApplicationInterviewsController;
  let interviewsController: InterviewsController;
  let service: {
    scheduleInterview: ReturnType<typeof vi.fn>;
    getInterviewsByApplication: ReturnType<typeof vi.fn>;
    getInterviewById: ReturnType<typeof vi.fn>;
    acceptInterview: ReturnType<typeof vi.fn>;
    declineInterview: ReturnType<typeof vi.fn>;
    cancelInterview: ReturnType<typeof vi.fn>;
  };

  const mockEmployer = {
    id: 'employer-user-1',
    email: 'employer@careermatch.local',
    role: UserRole.EMPLOYER,
    status: 'ACTIVE' as const,
  };

  const mockStudent = {
    id: 'student-user-1',
    email: 'student@careermatch.local',
    role: UserRole.STUDENT,
    status: 'ACTIVE' as const,
  };

  beforeEach(() => {
    service = {
      scheduleInterview: vi.fn(),
      getInterviewsByApplication: vi.fn(),
      getInterviewById: vi.fn(),
      acceptInterview: vi.fn(),
      declineInterview: vi.fn(),
      cancelInterview: vi.fn(),
    };

    appController = new ApplicationInterviewsController(
      service as unknown as InterviewsService,
    );
    interviewsController = new InterviewsController(
      service as unknown as InterviewsService,
    );
  });

  describe('ApplicationInterviewsController', () => {
    it('delegates scheduleInterview to service', async () => {
      const mockResult = { id: 'int-1', status: InterviewStatus.PROPOSED };
      service.scheduleInterview.mockResolvedValue(mockResult);

      const dto = {
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        durationMin: 45,
        meetingUrl: 'https://meet.google.com/abc',
      };

      const result = await appController.scheduleInterview(
        mockEmployer,
        'app-1',
        dto,
      );

      expect(service.scheduleInterview).toHaveBeenCalledWith(
        mockEmployer.id,
        'app-1',
        dto,
        mockEmployer.role,
      );
      expect(result).toBe(mockResult);
    });

    it('delegates getInterviewsByApplication to service', async () => {
      const mockResult = [{ id: 'int-1' }];
      service.getInterviewsByApplication.mockResolvedValue(mockResult);

      const result = await appController.getInterviewsByApplication(
        mockStudent,
        'app-1',
      );

      expect(service.getInterviewsByApplication).toHaveBeenCalledWith(
        mockStudent.id,
        'app-1',
        mockStudent.role,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe('InterviewsController', () => {
    it('delegates getById to service', async () => {
      const mockResult = { id: 'int-1' };
      service.getInterviewById.mockResolvedValue(mockResult);

      const result = await interviewsController.getById(mockStudent, 'int-1');

      expect(service.getInterviewById).toHaveBeenCalledWith(
        mockStudent.id,
        'int-1',
        mockStudent.role,
      );
      expect(result).toBe(mockResult);
    });

    it('delegates acceptInterview to service', async () => {
      const mockResult = { id: 'int-1', status: InterviewStatus.ACCEPTED };
      service.acceptInterview.mockResolvedValue(mockResult);

      const result = await interviewsController.acceptInterview(
        mockStudent,
        'int-1',
      );

      expect(service.acceptInterview).toHaveBeenCalledWith(
        mockStudent.id,
        'int-1',
      );
      expect(result).toBe(mockResult);
    });

    it('delegates declineInterview to service', async () => {
      const mockResult = { id: 'int-1', status: InterviewStatus.DECLINED };
      service.declineInterview.mockResolvedValue(mockResult);

      const dto = { reason: 'Schedule conflict' };
      const result = await interviewsController.declineInterview(
        mockStudent,
        'int-1',
        dto,
      );

      expect(service.declineInterview).toHaveBeenCalledWith(
        mockStudent.id,
        'int-1',
        dto,
      );
      expect(result).toBe(mockResult);
    });

    it('delegates cancelInterview to service', async () => {
      const mockResult = { id: 'int-1', status: InterviewStatus.CANCELLED };
      service.cancelInterview.mockResolvedValue(mockResult);

      const dto = { reason: 'Interviewer emergency' };
      const result = await interviewsController.cancelInterview(
        mockEmployer,
        'int-1',
        dto,
      );

      expect(service.cancelInterview).toHaveBeenCalledWith(
        mockEmployer.id,
        'int-1',
        dto,
        mockEmployer.role,
      );
      expect(result).toBe(mockResult);
    });
  });
});
