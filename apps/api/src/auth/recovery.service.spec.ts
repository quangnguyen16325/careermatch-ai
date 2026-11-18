import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RecoveryService } from './recovery.service.js';
import type { DatabaseService } from '../database/database.service.js';
import type { PasswordService } from './password.service.js';
import type { AccountMailService } from './account-mail.service.js';

describe('bounded asynchronous recovery requests', () => {
  it('acknowledges before lookup and bounds work independently of email existence', async () => {
    const lookup = vi.fn().mockResolvedValue(null);
    const service = new RecoveryService(
      {
        client: { user: { findUnique: lookup } },
      } as unknown as DatabaseService,
      {} as PasswordService,
      {} as AccountMailService,
      new ConfigService(),
    );
    expect(
      service.request('unknown@example.com', 'VERIFY_EMAIL'),
    ).toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
    service.request('other@example.com', 'RESET_PASSWORD');
    expect(() =>
      service.request('third@example.com', 'RESET_PASSWORD'),
    ).toThrow();
    await service.onModuleDestroy();
    expect(lookup).toHaveBeenCalledTimes(2);
    service.request('next@example.com', 'VERIFY_EMAIL');
    await service.onModuleDestroy();
    expect(lookup).toHaveBeenCalledTimes(3);
  });
  it('redacts job failures and releases capacity', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      const lookup = vi
        .fn()
        .mockRejectedValue(
          new Error('private-email token-secret database-password'),
        );
      const service = new RecoveryService(
        {
          client: { user: { findUnique: lookup } },
        } as unknown as DatabaseService,
        {} as PasswordService,
        {} as AccountMailService,
        new ConfigService(),
      );
      service.request('private@example.com', 'VERIFY_EMAIL');
      await service.onModuleDestroy();
      expect(log).toHaveBeenCalledOnce();
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /private|secret|password/,
      );
      service.request('next@example.com', 'VERIFY_EMAIL');
      await service.onModuleDestroy();
    } finally {
      log.mockRestore();
    }
  });
});
