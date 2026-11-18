import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { PasswordService } from './password.service.js';
import { AccountMailService } from './account-mail.service.js';
import { ttlSeconds } from './session.service.js';
import type { AccountTokenPurpose } from '../generated/prisma/enums.js';

const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class RecoveryService implements OnModuleDestroy {
  private readonly logger = new Logger(RecoveryService.name);
  private readonly pending = new Set<Promise<void>>();
  private hashing = 0;
  constructor(
    private readonly db: DatabaseService,
    private readonly passwords: PasswordService,
    private readonly mail: AccountMailService,
    private readonly config: ConfigService,
  ) {}

  request(email: string, purpose: AccountTokenPurpose): void {
    // Return before account lookup/SMTP: known and unknown accounts have the
    // same HTTP path. Bound outstanding jobs independently of account existence.
    if (this.pending.size >= 2)
      throw new HttpException({ code: 'RATE_LIMITED', retryAfter: 1 }, 429);
    const job = new Promise<void>((resolve) => setImmediate(resolve))
      .then(() => this.deliver(email, purpose))
      .catch(() => {
        this.logger.error('Account email job failed; retry the request later.');
      });
    this.pending.add(job);
    void job.finally(() => this.pending.delete(job));
  }

  async onModuleDestroy() {
    await Promise.all(this.pending);
  }

  private async deliver(email: string, purpose: AccountTokenPurpose) {
    const ttl =
      purpose === 'VERIFY_EMAIL'
        ? ttlSeconds(this.config.get('AUTH_VERIFY_TTL', '24h'), 172800)
        : ttlSeconds(this.config.get('AUTH_RESET_TTL', '30m'), 3600);
    const user = await this.db.client.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return;
    const token = randomBytes(32).toString('base64url');
    const issued = await this.db.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (
        !current ||
        current.email !== email ||
        (purpose === 'VERIFY_EMAIL'
          ? current.status !== 'PENDING_VERIFICATION' ||
            current.emailVerified !== null
          : current.status !== 'ACTIVE' || current.emailVerified === null)
      )
        return false;
      const now = new Date();
      // DB-backed cooldown applies across API replicas, serialized by User lock.
      const recent = await tx.accountToken.findFirst({
        where: {
          userId: user.id,
          purpose,
          createdAt: { gt: new Date(now.getTime() - 60000) },
        },
      });
      if (recent) return false;
      await tx.accountToken.updateMany({
        where: { userId: user.id, purpose, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.accountToken.create({
        data: {
          userId: user.id,
          email,
          purpose,
          tokenDigest: digest(token),
          expiresAt: new Date(now.getTime() + ttl * 1000),
        },
      });
      return true;
    });
    if (issued) await this.mail.send(email, purpose, token);
  }

  private invalid(purpose: AccountTokenPurpose): never {
    throw new BadRequestException({
      code:
        purpose === 'VERIFY_EMAIL'
          ? 'INVALID_VERIFICATION_TOKEN'
          : 'INVALID_RESET_TOKEN',
    });
  }

  async consume(
    token: string,
    purpose: AccountTokenPurpose,
    newPassword?: string,
  ) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) this.invalid(purpose);
    // Internal callers cannot bypass the same password rules used by HTTP DTOs.
    if (
      purpose === 'RESET_PASSWORD' &&
      (typeof newPassword !== 'string' ||
        newPassword.length < 12 ||
        newPassword.length > 128)
    )
      throw new BadRequestException({ code: 'VALIDATION_ERROR' });
    const known = await this.db.client.accountToken.findUnique({
      where: { tokenDigest: digest(token) },
    });
    if (
      !known ||
      known.purpose !== purpose ||
      known.consumedAt ||
      known.expiresAt <= new Date()
    )
      this.invalid(purpose);
    let passwordHash: string | undefined;
    if (purpose === 'RESET_PASSWORD') {
      if (this.hashing >= 2)
        throw new HttpException({ code: 'RATE_LIMITED', retryAfter: 1 }, 429);
      this.hashing++;
      try {
        passwordHash = await this.passwords.hash(newPassword!);
      } finally {
        this.hashing--;
      }
    }
    await this.db.client.$transaction(async (tx) => {
      // Same lock order as login: User before any session revocation. Recheck
      // token and account after waiting so concurrent consumption has one winner.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${known.userId}::uuid FOR UPDATE`;
      const current = await tx.accountToken.findUnique({
        where: { id: known.id },
      });
      const user = await tx.user.findUnique({ where: { id: known.userId } });
      const now = new Date();
      if (
        !current ||
        current.consumedAt ||
        current.expiresAt <= now ||
        !user ||
        user.email !== current.email ||
        (purpose === 'VERIFY_EMAIL'
          ? user.status !== 'PENDING_VERIFICATION' ||
            user.emailVerified !== null
          : user.status !== 'ACTIVE' || user.emailVerified === null)
      )
        this.invalid(purpose);
      await tx.accountToken.updateMany({
        where: { userId: user.id, purpose, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.user.update({
        where: { id: user.id },
        data:
          purpose === 'VERIFY_EMAIL'
            ? { status: 'ACTIVE', emailVerified: now }
            : { passwordHash },
      });
      if (purpose === 'RESET_PASSWORD')
        await tx.authSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now, revocationReason: 'PASSWORD_RESET' },
        });
    });
  }
}
