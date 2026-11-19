import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service.js';
import { QuerySkillDto } from './dto/query-skill.dto.js';

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Search and list standardized skills' })
  @ApiResponse({ status: 200, description: 'List of skills matching query' })
  findAll(@Query() query: QuerySkillDto) {
    return this.catalogService.findAllSkills(query);
  }
}
