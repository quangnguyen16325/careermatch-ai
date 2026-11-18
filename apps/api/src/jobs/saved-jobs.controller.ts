import {
  Controller,
  Delete,
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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { JobsService } from './jobs.service.js';
import { QuerySavedJobsDto } from './dto/query-saved-jobs.dto.js';

@ApiTags('saved-jobs')
@Controller('saved-jobs')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class SavedJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Student list saved jobs with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of saved jobs' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  getSavedJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuerySavedJobsDto,
  ) {
    return this.jobsService.getSavedJobs(user.id, query);
  }

  @Post(':jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student save a published job' })
  @ApiResponse({ status: 200, description: 'Job saved successfully' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'JOB_ALREADY_SAVED' })
  saveJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.saveJob(user.id, jobId);
  }

  @Delete(':jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student remove a job from saved list' })
  @ApiResponse({ status: 200, description: 'Job removed from saved list' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'SAVED_JOB_NOT_FOUND' })
  unsaveJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.unsaveJob(user.id, jobId);
  }

  @Get(':jobId/status')
  @ApiOperation({ summary: 'Check if a job is in current student saved list' })
  @ApiResponse({ status: 200, description: 'Saved status returned' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  isJobSaved(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.isJobSaved(user.id, jobId);
  }
}
