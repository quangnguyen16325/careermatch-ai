import {
  Controller,
  Get,
  INestApplication,
  UseFilters,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AuthModule } from '../src/auth/auth.module.js';
import { SessionService } from '../src/auth/session.service.js';
import { AuthGuard } from '../src/common/guards/auth.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { Roles } from '../src/common/decorators/roles.decorator.js';
import { CurrentUser } from '../src/common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator.js';
import { RegistrationFilter } from '../src/auth/registration.filter.js';

// Test-only routes: no placeholder authorization endpoints ship in production.
@Controller('policy-fixture')
@UseFilters(RegistrationFilter)
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
class PolicyFixture {
  @Get('admin') admin(@CurrentUser('id') id: string) {
    return { id };
  }
  @Get('student') @Roles('STUDENT') student(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return user;
  }
  @Get('employer') @Roles('EMPLOYER') employer() {
    return { allowed: true };
  }
  @Get('empty') @Roles() empty() {
    return { allowed: true };
  }
}
@Controller('no-policy-fixture')
@UseFilters(RegistrationFilter)
@UseGuards(AuthGuard, RolesGuard)
class NoPolicyFixture {
  @Get() get() {
    return { allowed: true };
  }
}

describe('exported authorization guards across module boundaries', () => {
  let app: INestApplication<App>;
  const me = vi.fn();
  beforeEach(async () => {
    me.mockReset().mockImplementation(async (token: string) => {
      if (token === 'Bearer revoked')
        throw new UnauthorizedException({ code: 'AUTHENTICATION_REQUIRED' });
      if (token === 'Bearer suspended')
        throw new ForbiddenException({ code: 'ACCOUNT_SUSPENDED' });
      const role = token.slice(7);
      return {
        id: 'current-db-user',
        email: 'test@example.com',
        role,
        status: 'ACTIVE',
        emailVerified: null,
      };
    });
    const module = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [PolicyFixture, NoPolicyFixture],
    })
      .overrideProvider(SessionService)
      .useValue({ me })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
  });
  it('rejects anonymous access before evaluating roles', async () => {
    const result = await request(app.getHttpServer())
      .get('/policy-fixture/admin')
      .expect(401);
    expect(result.body.code).toBe('AUTHENTICATION_REQUIRED');
    expect(me).not.toHaveBeenCalled();
  });
  it.each(['STUDENT', 'EMPLOYER', 'ADMIN'])(
    'allows only the matching %s route',
    async (role) => {
      for (const target of ['student', 'employer', 'admin']) {
        const r = await request(app.getHttpServer())
          .get('/policy-fixture/' + target)
          .set('Authorization', 'Bearer ' + role);
        expect(r.status).toBe(target.toUpperCase() === role ? 200 : 403);
      }
    },
  );
  it('uses handler policy rather than inherited class policy', async () => {
    const r = await request(app.getHttpServer())
      .get('/policy-fixture/student')
      .set('Authorization', 'Bearer STUDENT')
      .expect(200);
    expect(r.body.id).toBe('current-db-user');
  });
  it.each(['/policy-fixture/empty', '/no-policy-fixture'])(
    'denies absent/empty role policy at %s',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer ADMIN')
        .expect(403);
    },
  );
  it.each([
    ['revoked', 401],
    ['suspended', 403],
  ])('rejects %s live sessions', async (token, status) => {
    await request(app.getHttpServer())
      .get('/policy-fixture/student')
      .set('Authorization', 'Bearer ' + token)
      .expect(Number(status));
  });
});
