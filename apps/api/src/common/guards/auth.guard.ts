import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from '../../auth/session.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    // Never trust a principal left by another middleware or supplied by a body.
    delete request.user;
    const authorization = request.headers.authorization;
    if (!authorization)
      throw new UnauthorizedException({ code: 'AUTHENTICATION_REQUIRED' });
    request.user = await this.sessionService.me(authorization);
    return true;
  }
}
