import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create company profile for current employer' })
  @ApiResponse({ status: 201, description: 'Company profile created' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 409, description: 'COMPANY_ALREADY_EXISTS or TAX_CODE_EXISTS' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.create(user.id, dto);
  }

  @Get('my')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current employer linked company profile' })
  @ApiResponse({ status: 200, description: 'Company details returned' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'COMPANY_NOT_FOUND' })
  getMyCompany(@CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.getMyCompany(user.id);
  }

  @Patch('my')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current employer company profile' })
  @ApiResponse({ status: 200, description: 'Company updated' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'COMPANY_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'TAX_CODE_EXISTS' })
  updateMyCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateMyCompany(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public company profile by id' })
  @ApiResponse({ status: 200, description: 'Public company information' })
  @ApiResponse({ status: 404, description: 'COMPANY_NOT_FOUND' })
  getById(@Param('id') id: string) {
    return this.companiesService.getById(id);
  }
}
