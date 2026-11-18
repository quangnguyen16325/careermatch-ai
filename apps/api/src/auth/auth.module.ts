import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import { PasswordService } from './password.service.js';
import { RegistrationController } from './registration.controller.js';
import { RegistrationService } from './registration.service.js';
import {
  RegistrationGuard,
  SessionRateGuard,
  RecoveryRateGuard,
} from './registration.guard.js';
import { RecoveryService } from './recovery.service.js';
import { RecoveryController } from './recovery.controller.js';
import { AccountMailService } from './account-mail.service.js';
import { SessionService } from './session.service.js';
import { SessionController } from './session.controller.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { OwnershipService } from './ownership.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [RegistrationController, SessionController, RecoveryController],
  providers: [
    DatabaseService,
    PasswordService,
    RegistrationService,
    RegistrationGuard,
    SessionRateGuard,
    SessionService,
    AuthGuard,
    RolesGuard,
    OwnershipService,
    RecoveryRateGuard,
    RecoveryService,
    AccountMailService,
  ],
  exports: [
    DatabaseService,
    SessionService,
    PasswordService,
    AuthGuard,
    RolesGuard,
    OwnershipService,
  ],
})
export class AuthModule {}
