import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  it('uses unique salts, verifies exact passwords, and rejects malformed/unsafe encodings', async () => {
    const service = new PasswordService();
    const password = ' unchanged password ';
    const first = await service.hash(password);
    const second = await service.hash(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(await service.verify(password, first)).toBe(true);
    expect(await service.verify(password.trim(), first)).toBe(false);
    expect(await service.verify('wrong-password', first)).toBe(false);
    expect(await service.verify(password, 'broken')).toBe(false);
    expect(
      await service.verify(password, first.replace('$131072$', '$999999999$')),
    ).toBe(false);
  });
});
