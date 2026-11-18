import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { UserRole } from '../../generated/prisma/enums.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user)
      throw new UnauthorizedException({ code: 'AUTHENTICATION_REQUIRED' });
    // Missing/empty policy is a configuration error: default-deny.
    if (!roles?.length || !roles.includes(user.role))
      throw new ForbiddenException({ code: 'FORBIDDEN' });
    return true;
  }
}
