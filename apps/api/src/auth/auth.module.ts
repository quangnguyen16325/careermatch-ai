import { Module } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PasswordService } from './password.service.js';
import { RegistrationController } from './registration.controller.js';
import { RegistrationService } from './registration.service.js';
import { RegistrationGuard } from './registration.guard.js';

@Module({
  controllers: [RegistrationController],
  providers: [
    DatabaseService,
    PasswordService,
    RegistrationService,
    RegistrationGuard,
  ],
})
export class AuthModule {}
