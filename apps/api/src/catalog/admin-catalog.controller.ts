import {
  Body,
  Controller,
  Delete,
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
import { CatalogService } from './catalog.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateSkillDto } from './dto/create-skill.dto.js';

@ApiTags('admin-catalog')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin create a new career category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 409, description: 'CATEGORY_NAME_EXISTS' })
  createCategory(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.catalogService.createCategory(admin.id, dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Admin update career category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'CATEGORY_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'CATEGORY_NAME_EXISTS' })
  updateCategory(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalogService.updateCategory(admin.id, id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin delete career category (if no jobs linked)' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({ status: 400, description: 'CATEGORY_IN_USE' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'CATEGORY_NOT_FOUND' })
  deleteCategory(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.catalogService.deleteCategory(admin.id, id);
  }

  @Post('skills')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin create a standardized skill' })
  @ApiResponse({ status: 201, description: 'Skill created' })
  @ApiResponse({ status: 401, description: 'AUTHENTICATION_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 409, description: 'SKILL_NAME_EXISTS' })
  createSkill(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateSkillDto,
  ) {
    return this.catalogService.createSkill(admin.id, dto);
  }
}
