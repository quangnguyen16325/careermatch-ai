import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CompaniesController } from './companies.controller.js';
import { AdminCompaniesController } from './admin-companies.controller.js';
import { CompaniesService } from './companies.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [CompaniesController, AdminCompaniesController],
  providers: [CompaniesService, AuthGuard, RolesGuard],
  exports: [CompaniesService],
})
export class CompaniesModule {}
