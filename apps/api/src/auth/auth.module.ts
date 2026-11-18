import { Module } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PasswordService } from './password.service.js';
import { RegistrationController } from './registration.controller.js';
import { RegistrationService } from './registration.service.js';
import { RegistrationGuard, SessionRateGuard } from './registration.guard.js';
import { SessionService } from './session.service.js';
import { SessionController } from './session.controller.js';

@Module({
  controllers: [RegistrationController, SessionController],
  providers: [
    DatabaseService,
    PasswordService,
    RegistrationService,
    RegistrationGuard,
    SessionRateGuard,
    SessionService,
  ],
})
export class AuthModule {}
