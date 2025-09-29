import { Command } from 'commander';
import path from 'node:path';
import { getConfig } from '../lib/config.js';
import { run } from '../lib/utils.js';

export function demoCommand() {
  const cmd = new Command('demo')
    .description('Start demo for a repo, defined in config.repos[].demo.start')
    .option('-r, --repo <name>', 'repository name')
    .action(async (opts: { repo?: string }) => {
      const cfg = getConfig();
      const r = cfg.repos.find((x) => x.name.toLowerCase() === (opts.repo ?? '').toLowerCase());
      if (!r?.demo?.start) throw new Error('No demo.start configured for this repo');
      const repoPath = path.resolve(r.path);
      const [cmd, ...args] = r.demo.start.split(' ');
      await run(cmd, args, repoPath);
    });
  return cmd;
}


