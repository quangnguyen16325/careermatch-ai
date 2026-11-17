import {
  Body,
  Controller,
  Header,
  Post,
  UseFilters,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegisterDto } from './register.dto.js';
import { RegistrationService } from './registration.service.js';
import { RegistrationFilter } from './registration.filter.js';
import { RegistrationGuard } from './registration.guard.js';

@ApiTags('authentication')
@Controller('auth')
@UseFilters(RegistrationFilter)
@UseGuards(RegistrationGuard)
export class RegistrationController {
  constructor(private readonly registration: RegistrationService) {}

  @Post('register')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Register a Student or Employer; verification remains required',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Public User; no tokens or password hash',
    schema: {
      type: 'object',
      required: ['id', 'email', 'role', 'status', 'emailVerified'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string' },
        role: { type: 'string', enum: ['STUDENT', 'EMPLOYER'] },
        status: { type: 'string', enum: ['PENDING_VERIFICATION'] },
        emailVerified: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 409, description: 'EMAIL_ALREADY_EXISTS' })
  @ApiResponse({ status: 429, description: 'RATE_LIMITED; Retry-After header' })
  register(
    @Body(
      new ValidationPipe({
        expectedType: RegisterDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    )
    input: RegisterDto,
  ) {
    return this.registration.register(input);
  }
}
