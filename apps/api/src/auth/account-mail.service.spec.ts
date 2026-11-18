import { ConfigService } from '@nestjs/config';
import { AccountMailService } from './account-mail.service.js';
const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  close: vi.fn(),
  create: vi.fn(),
}));
vi.mock('nodemailer', () => ({ createTransport: mocks.create }));

describe('account email security configuration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.create.mockReturnValue({
      sendMail: mocks.sendMail,
      close: mocks.close,
    });
    mocks.sendMail.mockResolvedValue({});
  });
  const config = (extra = {}) =>
    new ConfigService({
      MAIL_MODE: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM: 'noreply@example.com',
      AUTH_PUBLIC_WEB_URL: 'https://careermatch.example.com',
      ...extra,
    });
  it('requires TLS and sends a fragment link without transport logging', async () => {
    await new AccountMailService(config()).send(
      'student@example.com',
      'VERIFY_EMAIL',
      'secret',
    );
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      requireTLS: true,
      secure: false,
      logger: false,
      debug: false,
    });
    const email = mocks.sendMail.mock.calls[0][0];
    expect(email.to.address).toBe('student@example.com');
    expect(email.text).toContain(
      'https://careermatch.example.com/verify-email#token=secret',
    );
    expect(mocks.close).toHaveBeenCalledOnce();
  });
  it.each([
    { AUTH_PUBLIC_WEB_URL: 'http://evil.example.com' },
    { AUTH_PUBLIC_WEB_URL: 'https://user:password@example.com' },
    { MAIL_MODE: 'local', SMTP_HOST: 'smtp.example.com' },
  ])('rejects unsafe configuration %j', async (extra) => {
    await expect(
      new AccountMailService(config(extra)).send(
        'a@example.com',
        'RESET_PASSWORD',
        'secret',
      ),
    ).rejects.toThrow();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
  it('closes the transport when SMTP fails', async () => {
    mocks.sendMail.mockRejectedValue(new Error('SMTP unavailable'));
    await expect(
      new AccountMailService(config()).send(
        'a@example.com',
        'RESET_PASSWORD',
        'secret',
      ),
    ).rejects.toThrow('SMTP unavailable');
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
