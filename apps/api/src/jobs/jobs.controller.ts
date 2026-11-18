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

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.EMPLOYER)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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

  @Get('my')
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

  @Get(':id')
  @ApiOperation({ summary: 'Get employer job details by id' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'JOB_NOT_FOUND' })
  getJobById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.getJobById(user.id, id);
  }

  @Patch(':id')
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
