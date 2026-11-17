import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

// Local/process limiter. Do not trust forwarded headers; distributed enforcement
// and a trusted-proxy policy must be added before multi-replica deployment.
@Injectable()
export class RegistrationGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    for (const [key, entry] of this.attempts) {
      if (entry.resetAt <= now) this.attempts.delete(key);
    }
    const key = request.socket.remoteAddress ?? 'unknown';
    let entry = this.attempts.get(key);
    if (!entry) {
      if (this.attempts.size >= 10000) this.reject(60);
      entry = { count: 0, resetAt: now + 60000 };
      this.attempts.set(key, entry);
    }
    if (++entry.count > 10)
      this.reject(Math.ceil((entry.resetAt - now) / 1000));
    return true;
  }

  private reject(retryAfter: number): never {
    throw new HttpException({ code: 'RATE_LIMITED', retryAfter }, 429);
  }
}

// Separate quota bucket for session endpoints; registration traffic must not
// consume an existing user's refresh/login allowance.
@Injectable()
export class SessionRateGuard extends RegistrationGuard {}
