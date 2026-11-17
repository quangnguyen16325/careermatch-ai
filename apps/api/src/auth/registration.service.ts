import { ConflictException, HttpException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PasswordService } from './password.service.js';
import { RegisterDto } from './register.dto.js';

@Injectable()
export class RegistrationService {
  private hashing = 0;

  constructor(
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
  ) {}

  async register(input: RegisterDto) {
    // Bound memory-intensive hashing work; do not queue unbounded scrypt jobs.
    if (this.hashing >= 2)
      throw new HttpException({ code: 'RATE_LIMITED', retryAfter: 1 }, 429);
    this.hashing++;
    let passwordHash: string;
    try {
      passwordHash = await this.passwords.hash(input.password);
    } finally {
      this.hashing--;
    }
    try {
      // Prisma nested writes are atomic: profile failure rolls back the User.
      return await this.database.client.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: input.role,
          status: 'PENDING_VERIFICATION',
          ...(input.role === 'STUDENT'
            ? { student: { create: { fullName: input.fullName } } }
            : { employer: { create: { fullName: input.fullName } } }),
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS' });
      }
      throw error;
    }
  }
}
