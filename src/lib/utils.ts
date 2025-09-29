import path from 'node:path';
import fs from 'fs-extra';
import { execa } from 'execa';

export async function isGitRepo(dir: string): Promise<boolean> {
  return fs.pathExists(path.join(dir, '.git'));
}

export async function run(cmd: string, args: string[], cwd: string) {
  return execa(cmd, args, { cwd, stdio: 'inherit', windowsHide: false, shell: false });
}

export function detectPackageManager(dir: string): 'yarn' | 'pnpm' | 'npm' {
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  return 'npm';
}


