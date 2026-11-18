import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { LoginDto } from './session.dto.js';
import { SessionService } from './session.service.js';
import { RegistrationFilter } from './registration.filter.js';
import { SessionRateGuard } from './registration.guard.js';

const COOKIE = 'careermatch_refresh';
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function readRefreshCookie(header?: string): string | null {
  if (!header || header.length > 16384) return null;
  const values = header
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.startsWith(COOKIE + '='));
  if (values.length !== 1) return null;
  const value = values[0].slice(COOKIE.length + 1);
  return tokenPattern.test(value) ? value : null;
}

@ApiTags('authentication')
@Controller('auth')
@UseFilters(RegistrationFilter)
export class SessionController {
  constructor(
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {}

  private origin(request: Request) {
    if (
      request.headers.origin !==
      this.config.get<string>('WEB_ORIGIN', 'http://localhost:5173')
    )
      throw new ForbiddenException({ code: 'FORBIDDEN' });
  }
  private cookie(response: Response, token: string, expiresAt?: Date) {
    const secure =
      this.config.get<string>('AUTH_COOKIE_SECURE') ??
      (this.config.get('NODE_ENV') === 'production' ? 'true' : 'false');
    response.cookie(COOKIE, token, {
      httpOnly: true,
      secure: secure === 'true',
      sameSite: 'lax',
      path: '/api/v1/auth',
      ...(expiresAt
        ? {
            expires: expiresAt,
            maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
          }
        : { expires: new Date(0), maxAge: 0 }),
    });
  }

  private noBody(request: Request) {
    if (request.body !== undefined)
      throw new BadRequestException({ code: 'VALIDATION_ERROR' });
  }

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @UseGuards(SessionRateGuard)
  @ApiOperation({
    summary: 'Login an ACTIVE account; refresh token is HttpOnly cookie only',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description:
      'user, accessToken, tokenType, expiresIn; Set-Cookie refresh token',
  })
  @ApiResponse({ status: 401, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({
    status: 403,
    description: 'FORBIDDEN, EMAIL_NOT_VERIFIED, ACCOUNT_SUSPENDED',
  })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(
      new ValidationPipe({
        expectedType: LoginDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: LoginDto,
  ) {
    this.origin(req);
    const { refreshToken, expiresAt, ...result } =
      await this.sessions.login(input);
    this.cookie(res, refreshToken, expiresAt);
    return result;
  }

  @Post('refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @UseGuards(SessionRateGuard)
  @ApiOperation({
    summary: 'Rotate refresh cookie; requires configured Origin and no body',
  })
  @ApiResponse({
    status: 200,
    description: 'accessToken, tokenType, expiresIn and rotated cookie',
  })
  @ApiResponse({
    status: 401,
    description: 'INVALID_REFRESH_TOKEN; cookie cleared',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    this.noBody(req);
    try {
      const { refreshToken, expiresAt, ...result } =
        await this.sessions.refresh(readRefreshCookie(req.headers.cookie));
      this.cookie(res, refreshToken, expiresAt);
      return result;
    } catch (error) {
      this.cookie(res, '');
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Idempotently revoke current session and clear refresh cookie',
  })
  @ApiResponse({ status: 204, description: 'No response body' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.origin(req);
    this.noBody(req);
    try {
      await this.sessions.logout(readRefreshCookie(req.headers.cookie));
    } finally {
      this.cookie(res, '');
    }
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Return current User after checking live account and session state',
  })
  @ApiResponse({ status: 200, description: 'Public User only' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  me(@Req() req: Request) {
    return this.sessions.me(req.headers.authorization);
  }
}
