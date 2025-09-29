import { Command } from 'commander';
import path from 'node:path';
import { getActiveConfig } from '../lib/config.js';
import { detectPackageManager, run } from '../lib/utils.js';

export function devCommand() {
  const cmd = new Command('dev')
    .description('Run frontend in dev mode (yarn dev)')
    .option('-r, --repo <name>', 'repository name')
    .option('-a, --all', 'run dev for all repos (respects ignores)')
    .action(async (opts: { repo?: string; all?: boolean }) => {
      const cfg = getActiveConfig();

      if (opts.all) {
        const targets = cfg.repos.filter((r) => !cfg.ignores?.includes(r.name));
        for (const r of targets) {
          const repoPath = path.resolve(r.path);
          const pm = r.packageManager ?? detectPackageManager(repoPath);
          console.log(`[dev][frontend][${r.name}] ${pm} run dev`);
          try {
            await run(pm, ['run', 'dev'], repoPath);
          } catch (err: any) {
            console.error(`[error][dev][${r.name}] ${err?.message ?? err}`);
          }
        }
        return;
      }

      const r = cfg.repos.find((x) => x.name.toLowerCase() === (opts.repo ?? '').toLowerCase());
      if (!r) throw new Error('Repository not found in config');
      if (cfg.ignores?.includes(r.name)) {
        console.log(`[dev] skipped ignored repo: ${r.name}`);
        return;
      }
      const repoPath = path.resolve(r.path);
      const pm = r.packageManager ?? detectPackageManager(repoPath);
      console.log(`[dev][frontend][${r.name}] ${pm} run dev`);
      await run(pm, ['run', 'dev'], repoPath);
    });
  return cmd;
}


