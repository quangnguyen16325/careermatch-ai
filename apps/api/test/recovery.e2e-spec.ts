import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { RecoveryService } from '../src/auth/recovery.service.js';

describe('verification and password recovery HTTP boundary', () => {
  let app: INestApplication<App>;
  const enqueue = vi.fn(),
    consume = vi.fn();
  beforeEach(async () => {
    enqueue.mockReset();
    consume.mockReset().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RecoveryService)
      .useValue({ request: enqueue, consume })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
  });
  it.each([
    ['resend-verification', 'VERIFY_EMAIL', 'verification'],
    ['forgot-password', 'RESET_PASSWORD', 'password reset'],
  ])(
    'normalizes %s and returns only a generic acknowledgement',
    async (path, purpose, description) => {
      const r = await request(app.getHttpServer())
        .post('/api/v1/auth/' + path)
        .send({ email: ' Student@Example.com ' })
        .expect(202);
      expect(enqueue).toHaveBeenCalledWith('student@example.com', purpose);
      expect(r.body).toEqual({
        message: `If eligible, ${description} instructions will be sent.`,
      });
      expect(r.headers['cache-control']).toBe('no-store');
    },
  );
  it.each([
    ['forgot-password', { email: 'bad' }],
    ['resend-verification', { email: 'a@example.com', role: 'ADMIN' }],
    ['verify-email', { token: 'short' }],
    ['reset-password', { token: 'a'.repeat(43), newPassword: 'short' }],
    [
      'reset-password',
      { token: 'a'.repeat(43), newPassword: 'valid-password', userId: 'spoof' },
    ],
  ])('rejects invalid or extra fields on %s', async (path, input) => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/auth/' + path)
      .send(input)
      .expect(400);
    expect(r.body.code).toBe('VALIDATION_ERROR');
    expect(enqueue).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
    expect(JSON.stringify(r.body)).not.toContain('valid-password');
  });
  it('consumes verification without issuing a session', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: 'a'.repeat(43) })
      .expect(204);
    expect(r.text).toBe('');
    expect(r.headers['set-cookie']).toBeUndefined();
    expect(consume).toHaveBeenCalledWith('a'.repeat(43), 'VERIFY_EMAIL');
  });
  it('preserves the exact new password', async () => {
    const password = '  my new password  ';
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: 'a'.repeat(43), newPassword: password })
      .expect(204);
    expect(consume).toHaveBeenCalledWith(
      'a'.repeat(43),
      'RESET_PASSWORD',
      password,
    );
  });
  it.each([
    ['verify-email', 'INVALID_VERIFICATION_TOKEN'],
    ['reset-password', 'INVALID_RESET_TOKEN'],
  ])('redacts invalid token errors on %s', async (path, code) => {
    consume.mockRejectedValue(new BadRequestException({ code }));
    const r = await request(app.getHttpServer())
      .post('/api/v1/auth/' + path)
      .send({
        token: 'a'.repeat(43),
        ...(path === 'reset-password'
          ? { newPassword: 'my-new-password' }
          : {}),
      })
      .expect(400);
    expect(r.body.code).toBe(code);
    expect(JSON.stringify(r.body)).not.toContain('a'.repeat(43));
  });
  it('bounds anonymous request volume', async () => {
    for (let i = 0; i < 10; i++)
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'a@example.com' })
        .expect(202);
    const r = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'b@example.com' })
      .expect(429);
    expect(r.headers['retry-after']).toBeDefined();
    expect(enqueue).toHaveBeenCalledTimes(10);
  });
});
