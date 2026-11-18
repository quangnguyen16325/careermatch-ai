import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { QueryEmployerJobsDto } from './dto/query-jobs.dto.js';
import { QueryPublicJobsDto } from './dto/query-public-jobs.dto.js';
import { QuerySavedJobsDto } from './dto/query-saved-jobs.dto.js';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ---------------------------------------------------------------------------
  // Public Job Search & Inspection
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'Public search and filter published jobs' })
  @ApiResponse({ status: 200, description: 'Paginated list of published jobs' })
  searchPublicJobs(@Query() query: QueryPublicJobsDto) {
    return this.jobsService.searchPublicJobs(query);
  }

  // ---------------------------------------------------------------------------
  // Employer Specific Endpoints (Prefix /my)
  // ---------------------------------------------------------------------------

  @Get('my')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current employer jobs with status filter' })
  @ApiResponse({ status: 200, description: 'Paginated list of employer jobs' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  getMyJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryEmployerJobsDto,
  ) {
    return this.jobsService.getMyJobs(user.id, query);
  }

  @Get('my/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employer own job details (including draft/rejected)' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  getEmployerJobById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.getJobById(user.id, id);
  }

  // ---------------------------------------------------------------------------
  // Student Saved Jobs Endpoints
  // ---------------------------------------------------------------------------

  @Get('saved')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Student list saved jobs' })
  @ApiResponse({ status: 200, description: 'Paginated list of saved jobs' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  getSavedJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuerySavedJobsDto,
  ) {
    return this.jobsService.getSavedJobs(user.id, query);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Student save a published job' })
  @ApiResponse({ status: 200, description: 'Job saved successfully' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'JOB_ALREADY_SAVED' })
  saveJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.saveJob(user.id, id);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Student remove a job from saved list' })
  @ApiResponse({ status: 200, description: 'Job removed from saved list' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'SAVED_JOB_NOT_FOUND' })
  unsaveJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.unsaveJob(user.id, id);
  }

  @Get(':id/save-status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if job is saved by current student' })
  @ApiResponse({ status: 200, description: 'Saved status returned' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  isJobSaved(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.isJobSaved(user.id, id);
  }

  // ---------------------------------------------------------------------------
  // Public Job Details
  // ---------------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({ summary: 'Get published job details by ID' })
  @ApiResponse({ status: 200, description: 'Public job details' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  getPublicJobById(@Param('id') id: string) {
    return this.jobsService.getPublicJobById(id);
  }

  // ---------------------------------------------------------------------------
  // Employer Job Mutation Endpoints
  // ---------------------------------------------------------------------------

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new draft job' })
  @ApiResponse({ status: 201, description: 'Job draft created' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid skills/category' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.createDraft(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job draft details or required skills' })
  @ApiResponse({ status: 200, description: 'Job updated' })
  @ApiResponse({ status: 400, description: 'Job not in DRAFT or REJECTED status' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  updateJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.updateJob(user.id, id, dto);
  }

  @Post(':id/submit-approval')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit job draft for admin approval (requires verified company)' })
  @ApiResponse({ status: 200, description: 'Job submitted for approval' })
  @ApiResponse({ status: 400, description: 'INVALID_STATE_TRANSITION' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'COMPANY_NOT_VERIFIED or FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  submitForApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.submitForApproval(user.id, id);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw pending job back to draft for editing' })
  @ApiResponse({ status: 200, description: 'Job reverted to draft' })
  @ApiResponse({ status: 400, description: 'INVALID_STATE_TRANSITION' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  withdrawToDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.withdrawToDraft(user.id, id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close a published job' })
  @ApiResponse({ status: 200, description: 'Job closed' })
  @ApiResponse({ status: 400, description: 'INVALID_STATE_TRANSITION' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  closeJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.closeJob(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a draft job' })
  @ApiResponse({ status: 200, description: 'Draft job deleted' })
  @ApiResponse({ status: 400, description: 'CANNOT_DELETE_NON_DRAFT' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  deleteDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.deleteDraft(user.id, id);
  }
}
