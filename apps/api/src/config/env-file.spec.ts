import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { repositoryEnvFiles } from './env-file.js';

describe('repository environment loading', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'careermatch-env-'));
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
    vi.stubEnv('CM_ENV_TEST_VALUE', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  function moduleUrl(relativePath: string): string {
    const path = join(root, relativePath);
    mkdirSync(join(path, '..'), { recursive: true });
    return pathToFileURL(path).href;
  }

  it.each([
    'apps/api/src/config/env-file.ts',
    'apps/api/dist/src/config/env-file.js',
    'apps/api/dist/config/env-file.js',
  ])('finds the same root .env from %s', (path) => {
    expect(repositoryEnvFiles(moduleUrl(path))).toEqual([join(root, '.env')]);
  });

  it('does not fall back to an arbitrary working-directory .env outside a checkout', () => {
    expect(
      repositoryEnvFiles(
        pathToFileURL('/env-fixture-without-repo/config.js').href,
      ),
    ).toEqual([]);
  });

  it.each([false, true])(
    'loads root .env and preserves process overrides (%s)',
    async (override) => {
      writeFileSync(join(root, '.env'), 'CM_ENV_TEST_VALUE=from-root\n');
      const url = moduleUrl('apps/api/src/config/env-file.ts');
      writeFileSync(
        join(root, 'apps/api/.env'),
        'CM_ENV_TEST_VALUE=from-workspace\n',
      );
      if (override) vi.stubEnv('CM_ENV_TEST_VALUE', 'from-process');
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ envFilePath: repositoryEnvFiles(url) }),
        ],
      }).compile();
      try {
        expect(module.get(ConfigService).get('CM_ENV_TEST_VALUE')).toBe(
          override ? 'from-process' : 'from-root',
        );
      } finally {
        await module.close();
      }
    },
  );

  it('supports injected environment variables when .env is absent', async () => {
    vi.stubEnv('CM_ENV_TEST_VALUE', 'ci-value');
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: repositoryEnvFiles(
            moduleUrl('apps/api/src/config/env-file.ts'),
          ),
        }),
      ],
    }).compile();
    try {
      expect(module.get(ConfigService).get('CM_ENV_TEST_VALUE')).toBe(
        'ci-value',
      );
    } finally {
      await module.close();
    }
  });
});
