import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { SessionService } from '../../auth/session.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('Auth and Roles Guards', () => {
  describe('AuthGuard', () => {
    it('throws UnauthorizedException when authorization header is missing', async () => {
      const mockSessionService = {} as unknown as SessionService;
      const guard = new AuthGuard(mockSessionService);
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('attaches user to request and allows activation when token is valid', async () => {
      const mockUser = {
        id: 'u1',
        email: 'employer@test.com',
        role: UserRole.EMPLOYER,
        status: 'ACTIVE',
      };
      const meSpy = vi.fn().mockResolvedValue(mockUser);
      const mockSessionService = {
        me: meSpy,
      } as unknown as SessionService;

      const guard = new AuthGuard(mockSessionService);
      const req: { headers: Record<string, string>; user?: unknown } = {
        headers: { authorization: 'Bearer valid-jwt-token' },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(req.user).toEqual(mockUser);
      expect(meSpy).toHaveBeenCalledWith('Bearer valid-jwt-token');
    });
  });

  describe('RolesGuard', () => {
    it('allows access when no roles are specified', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(undefined),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      const mockContext = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.EMPLOYER } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('throws ForbiddenException when user role does not match required roles', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue([UserRole.ADMIN]),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      const mockContext = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.STUDENT } }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('allows access when user has required role', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue([UserRole.EMPLOYER, UserRole.ADMIN]),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      const mockContext = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: UserRole.EMPLOYER } }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });
});
