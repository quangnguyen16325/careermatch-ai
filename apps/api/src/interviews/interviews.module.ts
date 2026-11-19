import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import {
  ApplicationInterviewsController,
  InterviewsController,
} from './interviews.controller.js';
import { InterviewsService } from './interviews.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [InterviewsController, ApplicationInterviewsController],
  providers: [InterviewsService, AuthGuard, RolesGuard],
  exports: [InterviewsService],
})
export class InterviewsModule {}
