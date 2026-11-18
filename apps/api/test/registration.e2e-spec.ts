import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { PasswordService } from '../src/auth/password.service.js';
import { Prisma } from '../src/generated/prisma/client.js';

describe('registration HTTP contract', () => {
  let app: INestApplication<App>;
  const create = vi.fn();
  const hash = vi.fn();
  const input = {
    email: ' Student@Example.com ',
    password: 'password-example',
    role: 'STUDENT',
    fullName: ' Example Student ',
  };

  beforeEach(async () => {
    create.mockReset().mockResolvedValue({
      id: 'test-id',
      email: 'student@example.com',
      role: 'STUDENT',
      status: 'PENDING_VERIFICATION',
      emailVerified: null,
    });
    hash.mockReset().mockResolvedValue('scrypt-test-digest');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({ client: { user: { create } } })
      .overrideProvider(PasswordService)
      .useValue({ hash })
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

  it.each(['STUDENT', 'EMPLOYER'])(
    'atomically creates %s profile and returns only public fields',
    async (role) => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...input, role })
        .expect(201);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(Object.keys(response.body).sort()).toEqual([
        'email',
        'emailVerified',
        'id',
        'role',
        'status',
      ]);
      expect(hash).toHaveBeenCalledWith(input.password);
      const args = create.mock.calls[0][0];
      expect(args.data.email).toBe('student@example.com');
      expect(args.data.passwordHash).toBe('scrypt-test-digest');
      expect(args.data[role === 'STUDENT' ? 'student' : 'employer']).toEqual({
        create: { fullName: 'Example Student' },
      });
      expect(
        args.data[role === 'STUDENT' ? 'employer' : 'student'],
      ).toBeUndefined();
      expect(args.select.passwordHash).toBeUndefined();
    },
  );

  it.each([
    { role: 'ADMIN' },
    { role: 'student' },
    { email: 'invalid' },
    { password: 'short' },
    { password: 'a'.repeat(129) },
    { password: 123456789012 },
    { fullName: '   ' },
    { fullName: 'a'.repeat(121) },
    { status: 'ACTIVE' },
    { userId: 'spoofed' },
    { emailVerified: new Date().toISOString() },
  ])('rejects invalid or privilege-escalating fields: %j', async (patch) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...input, ...patch })
      .expect(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(JSON.stringify(response.body)).not.toContain(input.password);
  });

  it('maps concurrent database unique conflicts to 409', async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('private DB detail', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(input)
      .expect(409);
    expect(response.body.code).toBe('EMAIL_ALREADY_EXISTS');
    expect(JSON.stringify(response.body)).not.toContain('private DB detail');
  });

  it('does not expose unexpected database failures', async () => {
    create.mockRejectedValue(new Error('secret database connection string'));
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(input)
      .expect(500);
    expect(response.body.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('bounds concurrent hashing and allows subsequent requests after hashing fails', async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    hash.mockImplementation(async () => {
      await blocked;
      throw new Error('hash failure');
    });
    const send = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(input)
        .then((r) => r);
    const first = send();
    const second = send();
    await vi.waitFor(() => expect(hash).toHaveBeenCalledTimes(2));
    const rejected = await send();
    expect(rejected.status).toBe(429);
    expect(rejected.headers['retry-after']).toBe('1');
    release();
    expect((await first).status).toBe(500);
    expect((await second).status).toBe(500);
    hash.mockResolvedValue('digest');
    expect((await send()).status).toBe(201);
  });

  it('rate limits by socket address rather than a spoofable forwarding header', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('X-Forwarded-For', `192.0.2.${i}`)
        .send(input)
        .expect(201);
    }
    const result = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', '198.51.100.1')
      .send(input)
      .expect(429);
    expect(result.body.code).toBe('RATE_LIMITED');
    expect(Number(result.headers['retry-after'])).toBeGreaterThan(0);
    expect(create).toHaveBeenCalledTimes(10);
  });
});
