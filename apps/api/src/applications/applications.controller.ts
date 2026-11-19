import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { ApplicationsService } from './applications.service.js';
import { ApplyJobDto } from './dto/apply-job.dto.js';
import { WithdrawApplicationDto } from './dto/withdraw-application.dto.js';
import { QueryMyApplicationsDto } from './dto/query-applications.dto.js';

@ApiTags('applications')
@Controller('applications')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Student apply for a published job via body payload' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or job not accepting applications' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND or STUDENT_PROFILE_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'APPLICATION_ALREADY_EXISTS' })
  async apply(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyJobDto,
  ) {
    if (!dto.jobId) {
      throw new BadRequestException({
        code: 'JOB_ID_REQUIRED',
        message: 'jobId is required in request body when applying via /applications',
      });
    }
    return this.applicationsService.applyForJob(user.id, dto.jobId, dto);
  }

  @Post('jobs/:jobId/apply')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Student apply for a published job via path parameter' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND or STUDENT_PROFILE_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'APPLICATION_ALREADY_EXISTS' })
  applyWithJobId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: ApplyJobDto,
  ) {
    return this.applicationsService.applyForJob(user.id, jobId, dto);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Student withdraw an active application' })
  @ApiResponse({ status: 200, description: 'Application withdrawn successfully' })
  @ApiResponse({ status: 400, description: 'INVALID_STATE_TRANSITION or CANNOT_WITHDRAW_ACTIVE_INTERVIEW' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'APPLICATION_NOT_FOUND' })
  withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: WithdrawApplicationDto,
  ) {
    return this.applicationsService.withdrawApplication(user.id, id, dto);
  }

  @Get('my')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Student list own submitted applications' })
  @ApiResponse({ status: 200, description: 'Paginated list of submitted applications' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  getMyApplications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryMyApplicationsDto,
  ) {
    return this.applicationsService.getMyApplications(user.id, query);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get application details by ID' })
  @ApiResponse({ status: 200, description: 'Application details' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'APPLICATION_NOT_FOUND' })
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.applicationsService.getApplicationById(
      user.id,
      id,
      user.role as UserRole,
    );
  }
}
