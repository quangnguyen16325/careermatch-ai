import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ApplicationsController } from './applications.controller.js';
import { JobApplyController } from './job-apply.controller.js';
import { ApplicationsService } from './applications.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [ApplicationsController, JobApplyController],
  providers: [ApplicationsService, AuthGuard, RolesGuard],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
