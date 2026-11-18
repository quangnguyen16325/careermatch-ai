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
import { CompaniesService } from './companies.service.js';
import { QueryCompaniesDto } from './dto/query-companies.dto.js';
import { VerifyCompanyDto } from './dto/verify-company.dto.js';

@ApiTags('admin-companies')
@Controller('admin/companies')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminCompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Admin list and filter companies' })
  @ApiResponse({ status: 200, description: 'Paginated list of companies' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  findAll(@Query() query: QueryCompaniesDto) {
    return this.companiesService.adminFindAll(query);
  }

  @Patch(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin verify or reject company' })
  @ApiResponse({ status: 200, description: 'Company verification status updated' })
  @ApiResponse({ status: 400, description: 'INVALID_STATE_TRANSITION or REJECTION_REASON_REQUIRED' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'COMPANY_NOT_FOUND' })
  verify(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VerifyCompanyDto,
  ) {
    return this.companiesService.adminVerify(admin.id, id, dto);
  }
}
