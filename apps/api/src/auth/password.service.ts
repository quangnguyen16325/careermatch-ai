import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const COST = 131072;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      {
        N: COST,
        r: BLOCK_SIZE,
        p: PARALLELISM,
        maxmem: 160 * 1024 * 1024,
      },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(password, salt);
    return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELISM}$${salt.toString('hex')}$${key.toString('hex')}`;
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    const parts = encoded.split('$');
    if (
      parts.length !== 6 ||
      parts[0] !== 'scrypt' ||
      parts[1] !== String(COST) ||
      parts[2] !== String(BLOCK_SIZE) ||
      parts[3] !== String(PARALLELISM) ||
      !/^[a-f0-9]{32}$/.test(parts[4]) ||
      !/^[a-f0-9]{128}$/.test(parts[5])
    )
      return false;
    const key = await derive(password, Buffer.from(parts[4], 'hex'));
    return timingSafeEqual(key, Buffer.from(parts[5], 'hex'));
  }
}
