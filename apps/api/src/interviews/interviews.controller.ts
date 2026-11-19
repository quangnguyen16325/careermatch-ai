import {
  Body,
  Controller,
  Get,
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
import { InterviewsService } from './interviews.service.js';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto.js';
import { DeclineInterviewDto } from './dto/decline-interview.dto.js';
import { CancelInterviewDto } from './dto/cancel-interview.dto.js';

@ApiTags('interviews')
@Controller('applications/:applicationId/interviews')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApplicationInterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Employer schedule interview invitation for candidate' })
  @ApiResponse({ status: 201, description: 'Interview scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid schedule parameters' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'APPLICATION_NOT_FOUND' })
  scheduleInterview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.interviewsService.scheduleInterview(
      user.id,
      applicationId,
      dto,
      user.role as UserRole,
    );
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List interviews for an application' })
  @ApiResponse({ status: 200, description: 'List of scheduled interviews' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'APPLICATION_NOT_FOUND' })
  getInterviewsByApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
  ) {
    return this.interviewsService.getInterviewsByApplication(
      user.id,
      applicationId,
      user.role as UserRole,
    );
  }
}

@ApiTags('interviews')
@Controller('interviews')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get interview details by ID' })
  @ApiResponse({ status: 200, description: 'Interview details' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'INTERVIEW_NOT_FOUND' })
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.interviewsService.getInterviewById(
      user.id,
      id,
      user.role as UserRole,
    );
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Student accept proposed interview invitation' })
  @ApiResponse({ status: 200, description: 'Interview accepted successfully' })
  @ApiResponse({ status: 400, description: 'INVALID_STATE_TRANSITION' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'INTERVIEW_NOT_FOUND' })
  acceptInterview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.interviewsService.acceptInterview(user.id, id);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Student decline proposed interview invitation' })
  @ApiResponse({ status: 200, description: 'Interview declined' })
  @ApiResponse({ status: 400, description: 'INVALID_STATE_TRANSITION' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'INTERVIEW_NOT_FOUND' })
  declineInterview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DeclineInterviewDto,
  ) {
    return this.interviewsService.declineInterview(user.id, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Employer cancel scheduled interview' })
  @ApiResponse({ status: 200, description: 'Interview cancelled' })
  @ApiResponse({ status: 400, description: 'INVALID_STATE_TRANSITION' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'INTERVIEW_NOT_FOUND' })
  cancelInterview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelInterviewDto,
  ) {
    return this.interviewsService.cancelInterview(
      user.id,
      id,
      dto,
      user.role as UserRole,
    );
  }
}
