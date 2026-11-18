import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { SessionService, ttlSeconds } from '../src/auth/session.service.js';
import { readRefreshCookie } from '../src/auth/session.controller.js';

describe('session HTTP boundary', () => {
  let app: INestApplication<App>;
  const raw = 'a'.repeat(43);
  const login = vi.fn(),
    refresh = vi.fn(),
    logout = vi.fn(),
    me = vi.fn();
  const origin = 'http://localhost:5173';
  const payload = {
    email: ' Student@Example.com ',
    password: 'password-example',
  };
  const result = () => ({
    accessToken: 'access',
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshToken: raw,
    expiresAt: new Date(Date.now() + 86400000),
  });

  beforeEach(async () => {
    login
      .mockReset()
      .mockResolvedValue({ ...result(), user: { id: 'public-user' } });
    refresh.mockReset().mockResolvedValue(result());
    logout.mockReset().mockResolvedValue(undefined);
    me.mockReset().mockResolvedValue({ id: 'public-user' });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SessionService)
      .useValue({ login, refresh, logout, me })
      .overrideProvider(ConfigService)
      .useValue({
        get: (name: string, fallback?: unknown) =>
          ({
            WEB_ORIGIN: origin,
            NODE_ENV: 'production',
            AUTH_COOKIE_SECURE: 'true',
          })[name] ?? fallback,
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('normalizes email and keeps refresh token out of JSON in a scoped secure cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send(payload)
      .expect(200);
    expect(login).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: payload.password,
    });
    expect(response.body).toEqual({
      accessToken: 'access',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: 'public-user' },
    });
    const cookie = response.headers['set-cookie'][0];
    for (const value of [
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      'Path=/api/v1/auth',
    ])
      expect(cookie).toContain(value);
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it.each(['/login', '/refresh', '/logout'])(
    'rejects missing and foreign origins for %s',
    async (path) => {
      await request(app.getHttpServer())
        .post('/api/v1/auth' + path)
        .send(path === '/login' ? payload : {})
        .expect(403);
      await request(app.getHttpServer())
        .post('/api/v1/auth' + path)
        .set('Origin', 'https://foreign.example')
        .send(path === '/login' ? payload : {})
        .expect(403);
      expect(login).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
      expect(logout).not.toHaveBeenCalled();
    },
  );
  it.each([
    { password: 'short' },
    { email: 123 },
    { password: 123456789012 },
    { role: 'ADMIN' },
    { email: 'bad' },
  ])('rejects invalid login %j', async (patch) => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ ...payload, ...patch })
      .expect(400);
    expect(login).not.toHaveBeenCalled();
  });
  it.each(['/refresh', '/logout'])(
    'rejects JSON payloads on %s',
    async (path) => {
      await request(app.getHttpServer())
        .post('/api/v1/auth' + path)
        .set('Origin', origin)
        .send({ refreshToken: raw })
        .expect(400);
      expect(refresh).not.toHaveBeenCalled();
      expect(logout).not.toHaveBeenCalled();
    },
  );

  it('rotates cookie and never exposes raw refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', `careermatch_refresh=${raw}`)
      .expect(200);
    expect(refresh).toHaveBeenCalledWith(raw);
    expect(response.body).toEqual({
      accessToken: 'access',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
  });
  it('clears invalid refresh cookie and returns a safe error', async () => {
    refresh.mockRejectedValue(
      new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN' }),
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Origin', origin)
      .expect(401);
    expect(response.body.code).toBe('INVALID_REFRESH_TOKEN');
    expect(response.headers['set-cookie'][0]).toContain('Max-Age=0');
  });
  it('logout is bodyless and clears the same cookie path', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Origin', origin)
      .expect(204);
    expect(logout).toHaveBeenCalledWith(null);
    expect(response.text).toBe('');
    expect(response.headers['set-cookie'][0]).toContain('Path=/api/v1/auth');
  });
  it('me passes bearer token to live session validation', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer access')
      .expect(200);
    expect(me).toHaveBeenCalledWith('Bearer access');
  });
});

describe('session input helpers', () => {
  it('accepts only bounded TTLs with explicit units', () => {
    expect(ttlSeconds('15m', 86400)).toBe(900);
    for (const value of ['0s', '-1h', 'Infinity', '30', '999999999999d', '25h'])
      expect(() => ttlSeconds(value, 86400)).toThrow();
  });
  it('rejects ambiguous or malformed refresh cookies', () => {
    const token = 'a'.repeat(43);
    expect(readRefreshCookie(`other=x; careermatch_refresh=${token}`)).toBe(
      token,
    );
    for (const header of [
      undefined,
      'careermatch_refresh=bad',
      `careermatch_refresh=${token}; careermatch_refresh=${token}`,
      'careermatch_refresh=%00',
      'x'.repeat(17000),
    ])
      expect(readRefreshCookie(header)).toBeNull();
  });
});
