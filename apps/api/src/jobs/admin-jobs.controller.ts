import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { JobsService } from './jobs.service.js';
import { QueryAdminJobsDto } from './dto/query-admin-jobs.dto.js';
import { ModerateJobDto } from './dto/moderate-job.dto.js';

@ApiTags('admin-jobs')
@Controller('admin/jobs')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin list and filter jobs across companies' })
  @ApiResponse({ status: 200, description: 'Paginated list of jobs' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  findAll(@Query() query: QueryAdminJobsDto) {
    return this.jobsService.adminFindAll(query);
  }

  @Patch(':id/moderate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin approve, reject or close a job' })
  @ApiResponse({ status: 200, description: 'Job status updated and employers notified' })
  @ApiResponse({ status: 400, description: 'INVALID_STATE_TRANSITION or REJECTION_REASON_REQUIRED' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  moderate(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerateJobDto,
  ) {
    return this.jobsService.adminModerate(admin.id, id, dto);
  }
}
