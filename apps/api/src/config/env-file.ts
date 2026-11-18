import { existsSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve from the module, not process.cwd(). The compiled module may live in
// dist/src/config, so a fixed number of parent directories is not reliable.
export function repositoryEnvFiles(moduleUrl: string): string[] {
  let directory = dirname(fileURLToPath(moduleUrl));
  while (true) {
    if (existsSync(join(directory, 'pnpm-workspace.yaml'))) {
      return [join(directory, '.env')];
    }
    const parent = dirname(directory);
    if (directory === parse(directory).root || parent === directory) return [];
    directory = parent;
  }
}

export const envFilePath = repositoryEnvFiles(import.meta.url);
