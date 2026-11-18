import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CatalogService } from './catalog.service.js';
import { CategoriesController } from './categories.controller.js';
import { SkillsController } from './skills.controller.js';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [
    CategoriesController,
    SkillsController,
    AdminCatalogController,
  ],
  providers: [CatalogService, AuthGuard, RolesGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
