import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service.js';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List all career categories with job counts' })
  @ApiResponse({ status: 200, description: 'List of career categories' })
  findAll() {
    return this.catalogService.findAllCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get career category details by ID' })
  @ApiResponse({ status: 200, description: 'Career category details' })
  @ApiResponse({ status: 404, description: 'CATEGORY_NOT_FOUND' })
  getById(@Param('id') id: string) {
    return this.catalogService.getCategoryById(id);
  }
}
