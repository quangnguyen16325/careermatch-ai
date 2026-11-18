import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [JobsController],
  providers: [JobsService, AuthGuard, RolesGuard],
  exports: [JobsService],
})
export class JobsModule {}
