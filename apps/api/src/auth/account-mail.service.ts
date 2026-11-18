import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { AccountTokenPurpose } from '../generated/prisma/enums.js';

@Injectable()
export class AccountMailService {
  constructor(private readonly config: ConfigService) {}

  async send(email: string, purpose: AccountTokenPurpose, token: string) {
    const local = this.config.get('MAIL_MODE') === 'local';
    const host = this.config.getOrThrow<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    const from = this.config.getOrThrow<string>('SMTP_FROM');
    const origin = new URL(
      this.config.getOrThrow<string>('AUTH_PUBLIC_WEB_URL'),
    );
    if (
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== '/' ||
      (origin.protocol !== 'https:' &&
        !(
          local &&
          origin.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(origin.hostname)
        )) ||
      (local && !['mailpit', 'localhost', '127.0.0.1'].includes(host))
    )
      throw new Error('Invalid account mail configuration');
    const secure = !local && port === 465;
    const user = this.config.get<string>('SMTP_USER');
    const transport = createTransport({
      host,
      port,
      secure,
      requireTLS: !local,
      ignoreTLS: local,
      ...(user
        ? {
            auth: {
              user,
              pass: this.config.getOrThrow<string>('SMTP_PASSWORD'),
            },
          }
        : {}),
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    const verify = purpose === 'VERIFY_EMAIL';
    const link = new URL(verify ? '/verify-email' : '/reset-password', origin);
    // Fragment avoids putting the secret in HTTP access logs/referrer URLs.
    link.hash = new URLSearchParams({ token }).toString();
    try {
      await transport.sendMail({
        from,
        to: { address: email, name: '' },
        subject: verify
          ? 'Verify your CareerMatch AI email'
          : 'Reset your CareerMatch AI password',
        text: `${verify ? 'Verify your email' : 'Reset your password'} using this single-use link:\n${link.href}\n\nIf you did not request this, ignore this message.`,
      });
    } finally {
      transport.close();
    }
  }
}
