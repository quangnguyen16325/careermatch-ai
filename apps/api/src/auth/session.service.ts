import {
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { DatabaseService } from '../database/database.service.js';
import { PasswordService } from './password.service.js';
import { LoginDto } from './session.dto.js';
import type { User } from '../generated/prisma/client.js';

const publicSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  emailVerified: true,
} as const;
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const randomToken = () => randomBytes(32).toString('base64url');
const dummyHash = `scrypt$131072$8$1$${'0'.repeat(32)}$${'0'.repeat(128)}`;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function ttlSeconds(value: string, maximum: number): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  const seconds = match
    ? Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2]] ?? 0)
    : 0;
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > maximum)
    throw new Error('Invalid authentication TTL');
  return seconds;
}

@Injectable()
export class SessionService {
  private verifying = 0;
  constructor(
    private readonly db: DatabaseService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
  ) {}

  private options() {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET', '');
    if (Buffer.byteLength(secret) < 32)
      throw new Error('JWT_ACCESS_SECRET must contain at least 32 bytes');
    return {
      key: new TextEncoder().encode(secret),
      issuer: this.config.get<string>('JWT_ISSUER', 'careermatch-api'),
      audience: this.config.get<string>('JWT_AUDIENCE', 'careermatch-web'),
      accessTtl: ttlSeconds(
        this.config.get<string>('JWT_ACCESS_TTL', '15m'),
        86400,
      ),
      refreshTtl: ttlSeconds(
        this.config.get<string>('JWT_REFRESH_TTL', '7d'),
        2592000,
      ),
    };
  }

  private active(user: Pick<User, 'status'>) {
    if (user.status === 'PENDING_VERIFICATION')
      throw new ForbiddenException({ code: 'EMAIL_NOT_VERIFIED' });
    if (user.status !== 'ACTIVE')
      throw new ForbiddenException({ code: 'ACCOUNT_SUSPENDED' });
  }

  private async access(
    user: Pick<User, 'id' | 'role'>,
    sid: string,
    expiresAt: Date,
  ) {
    const options = this.options();
    const now = Math.floor(Date.now() / 1000);
    const expires = Math.min(
      now + options.accessTtl,
      Math.floor(expiresAt.getTime() / 1000),
    );
    const accessToken = await new SignJWT({ sid, role: user.role })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer(options.issuer)
      .setAudience(options.audience)
      .setIssuedAt(now)
      .setExpirationTime(expires)
      .sign(options.key);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: Math.max(0, expires - now),
    };
  }

  async login(input: LoginDto) {
    const options = this.options();
    if (this.verifying >= 2)
      throw new HttpException({ code: 'RATE_LIMITED', retryAfter: 1 }, 429);
    this.verifying++;
    let user: User | null;
    let valid: boolean;
    try {
      user = await this.db.client.user.findUnique({
        where: { email: input.email },
      });
      valid = await this.passwords.verify(
        input.password,
        user?.passwordHash ?? dummyHash,
      );
    } finally {
      this.verifying--;
    }
    if (!valid || !user)
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    this.active(user);
    const refreshToken = randomToken();
    const expiresAt = new Date(Date.now() + options.refreshTtl * 1000);
    const result = await this.db.client.$transaction(async (tx) => {
      // Serialize with account status changes; future reset/suspension workflows
      // must take this same User lock before revoking session families.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { ...publicSelect, passwordHash: true },
      });
      if (current.passwordHash !== user.passwordHash)
        throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
      this.active(current);
      const session = await tx.authSession.create({
        data: {
          userId: user.id,
          expiresAt,
          refreshTokens: {
            create: { tokenDigest: digest(refreshToken), expiresAt },
          },
        },
      });
      return {
        session,
        user: {
          id: current.id,
          email: current.email,
          role: current.role,
          status: current.status,
          emailVerified: current.emailVerified,
        },
      };
    });
    return {
      ...(await this.access(result.user, result.session.id, expiresAt)),
      user: result.user,
      refreshToken,
      expiresAt,
    };
  }

  async refresh(token: string | null) {
    if (!token)
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN' });
    const tokenDigest = digest(token);
    const known = await this.db.client.refreshToken.findUnique({
      where: { tokenDigest },
    });
    if (!known)
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN' });
    const result = await this.db.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "AuthSession" WHERE "id"=${known.sessionId}::uuid FOR UPDATE`;
      const session = await tx.authSession.findUnique({
        where: { id: known.sessionId },
        include: { user: { select: publicSelect } },
      });
      const previous = await tx.refreshToken.findUnique({
        where: { tokenDigest },
      });
      const now = new Date();
      if (
        !session ||
        !previous ||
        session.revokedAt ||
        session.expiresAt <= now ||
        previous.expiresAt <= now
      )
        return null;
      if (previous.consumedAt || session.user.status !== 'ACTIVE') {
        await tx.authSession.update({
          where: { id: session.id },
          data: {
            revokedAt: now,
            revocationReason: previous.consumedAt
              ? 'REUSE'
              : 'ACCOUNT_INACTIVE',
          },
        });
        return null; // Commit revocation before returning the authentication error.
      }
      const consumed = await tx.refreshToken.updateMany({
        where: { id: previous.id, consumedAt: null },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return null;
      const next = randomToken();
      await tx.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenDigest: digest(next),
          expiresAt: session.expiresAt,
        },
      });
      return {
        refreshToken: next,
        expiresAt: session.expiresAt,
        user: session.user,
        sid: session.id,
      };
    });
    if (!result)
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN' });
    return {
      ...(await this.access(result.user, result.sid, result.expiresAt)),
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    };
  }

  async logout(token: string | null) {
    if (!token) return;
    const known = await this.db.client.refreshToken.findUnique({
      where: { tokenDigest: digest(token) },
    });
    if (!known) return;
    await this.db.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "AuthSession" WHERE "id"=${known.sessionId}::uuid FOR UPDATE`;
      await tx.authSession.updateMany({
        where: { id: known.sessionId, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: 'LOGOUT' },
      });
    });
  }

  async me(authorization?: string) {
    const options = this.options();
    let claims;
    try {
      if (!authorization?.startsWith('Bearer ') || authorization.length > 8192)
        throw new Error('Missing token');
      claims = (
        await jwtVerify(authorization.slice(7), options.key, {
          algorithms: ['HS256'],
          issuer: options.issuer,
          audience: options.audience,
          requiredClaims: ['sub', 'sid', 'role', 'iat', 'exp'],
          typ: 'JWT',
        })
      ).payload;
      if (
        typeof claims.sub !== 'string' ||
        !uuid.test(claims.sub) ||
        typeof claims.sid !== 'string' ||
        !uuid.test(claims.sid)
      )
        throw new Error('Invalid claims');
    } catch {
      throw new UnauthorizedException({ code: 'AUTHENTICATION_REQUIRED' });
    }
    const session = await this.db.client.authSession.findUnique({
      where: { id: claims.sid },
      include: { user: { select: publicSelect } },
    });
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    )
      throw new UnauthorizedException({ code: 'AUTHENTICATION_REQUIRED' });
    this.active(session.user);
    return session.user; // Always return current DB role, never the stale claim.
  }
}
