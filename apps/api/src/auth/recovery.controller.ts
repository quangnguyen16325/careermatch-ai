import {
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  UseFilters,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  RecoveryEmailDto,
  AccountTokenDto,
  ResetPasswordDto,
} from './recovery.dto.js';
import { RecoveryService } from './recovery.service.js';
import { RegistrationFilter } from './registration.filter.js';
import { RecoveryRateGuard } from './registration.guard.js';

const body = (
  expectedType:
    typeof RecoveryEmailDto | typeof AccountTokenDto | typeof ResetPasswordDto,
) =>
  new ValidationPipe({
    expectedType,
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

@ApiTags('authentication')
@Controller('auth')
@UseFilters(RegistrationFilter)
@UseGuards(RecoveryRateGuard)
export class RecoveryController {
  constructor(private readonly recovery: RecoveryService) {}

  @Post('resend-verification')
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Request email verification; same response for every eligible or unknown account',
  })
  @ApiBody({ type: RecoveryEmailDto })
  @ApiResponse({
    status: 202,
    description: 'Generic acknowledgment, not delivery confirmation',
  })
  resend(@Body(body(RecoveryEmailDto)) input: RecoveryEmailDto) {
    this.recovery.request(input.email, 'VERIFY_EMAIL');
    return { message: 'If eligible, verification instructions will be sent.' };
  }

  @Post('forgot-password')
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Request password recovery; no account existence disclosure',
  })
  @ApiBody({ type: RecoveryEmailDto })
  @ApiResponse({
    status: 202,
    description: 'Generic acknowledgment, not delivery confirmation',
  })
  forgot(@Body(body(RecoveryEmailDto)) input: RecoveryEmailDto) {
    this.recovery.request(input.email, 'RESET_PASSWORD');
    return {
      message: 'If eligible, password reset instructions will be sent.',
    };
  }

  @Post('verify-email')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Consume a verification token; activate account without signing in',
  })
  @ApiBody({ type: AccountTokenDto })
  @ApiResponse({ status: 204, description: 'Email verified' })
  @ApiResponse({
    status: 400,
    description: 'INVALID_VERIFICATION_TOKEN or VALIDATION_ERROR',
  })
  async verify(@Body(body(AccountTokenDto)) input: AccountTokenDto) {
    await this.recovery.consume(input.token, 'VERIFY_EMAIL');
  }

  @Post('reset-password')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Consume a reset token, replace password and revoke all sessions',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 204, description: 'Password reset; sign in again' })
  @ApiResponse({
    status: 400,
    description: 'INVALID_RESET_TOKEN or VALIDATION_ERROR',
  })
  async reset(@Body(body(ResetPasswordDto)) input: ResetPasswordDto) {
    await this.recovery.consume(
      input.token,
      'RESET_PASSWORD',
      input.newPassword,
    );
  }
}
