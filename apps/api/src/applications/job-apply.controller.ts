import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { ApplicationsService } from './applications.service.js';
import { ApplyJobDto } from './dto/apply-job.dto.js';

@ApiTags('applications')
@Controller('jobs')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class JobApplyController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post(':jobId/apply')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Student apply for a published job via /jobs/:jobId/apply' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 400, description: 'JOB_NOT_ACCEPTING_APPLICATIONS or Validation error' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND or STUDENT_PROFILE_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'APPLICATION_ALREADY_EXISTS' })
  apply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: ApplyJobDto,
  ) {
    return this.applicationsService.applyForJob(user.id, jobId, dto);
  }
}
