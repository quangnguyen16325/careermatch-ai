import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../../auth/session.service.js';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    if (!authorization) {
      throw new UnauthorizedException({ code: 'AUTHENTICATION_REQUIRED' });
    }

    const user = await this.sessionService.me(authorization);
    request.user = user as AuthenticatedUser;
    return true;
  }
}
