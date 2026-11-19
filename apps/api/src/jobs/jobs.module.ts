import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { JobsController } from './jobs.controller.js';
import { AdminJobsController } from './admin-jobs.controller.js';
import { SavedJobsController } from './saved-jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [JobsController, SavedJobsController, AdminJobsController],
  providers: [JobsService, AuthGuard, RolesGuard],
  exports: [JobsService],
})
export class JobsModule {}
