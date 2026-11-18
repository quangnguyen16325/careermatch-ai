import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

@Catch()
export class RegistrationFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : null;
    const supplied =
      typeof payload === 'object' && payload !== null ? payload : {};
    const code =
      'code' in supplied && typeof supplied.code === 'string'
        ? supplied.code
        : status === 400
          ? 'VALIDATION_ERROR'
          : 'INTERNAL_ERROR';
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('Cache-Control', 'no-store');
    if (status === 429) {
      const seconds = 'retryAfter' in supplied ? supplied.retryAfter : 60;
      response.setHeader('Retry-After', String(seconds));
    }
    const messages: Record<string, string> = {
      VALIDATION_ERROR: 'Request validation failed.',
      EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
      INVALID_CREDENTIALS: 'Invalid email or password.',
      AUTHENTICATION_REQUIRED: 'A valid session is required.',
      INVALID_REFRESH_TOKEN: 'Refresh token is invalid or expired.',
      INVALID_VERIFICATION_TOKEN: 'Verification token is invalid or expired.',
      INVALID_RESET_TOKEN: 'Password reset token is invalid or expired.',
      FORBIDDEN: 'Request is not permitted.',
      RESOURCE_NOT_FOUND: 'Resource not found.',
      EMAIL_NOT_VERIFIED: 'Verify your email before signing in.',
      ACCOUNT_SUSPENDED: 'Account is suspended.',
      RATE_LIMITED: 'Too many requests. Try again later.',
      INTERNAL_ERROR: 'An unexpected error occurred.',
    };
    response.status(status).json({
      statusCode: status,
      code,
      message: messages[code] ?? messages.INTERNAL_ERROR,
      details: [],
      requestId,
    });
  }
}
