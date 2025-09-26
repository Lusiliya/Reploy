import { Command } from 'commander';
import simpleGit from 'simple-git';
import path from 'node:path';
import fs from 'fs-extra';
import { getActiveConfig } from '../lib/config.js';

export function remoteCommand() {
  const cmd = new Command('remote')
    .description('Check and fix remote URLs for repositories')
    .option('-r, --repo <name>', 'repository name')
    .option('-a, --all', 'check all configured repos (respects ignores)')
    .option('--fix', 'fix incorrect remote URLs')
    .action(async (opts: { repo?: string; all?: boolean; fix?: boolean }) => {
      const cfg = getActiveConfig();
      let targets = cfg.repos;

      if (opts.repo) {
        targets = targets.filter((r) => r.name.toLowerCase() === opts.repo!.toLowerCase());
        if (targets.length === 0) {
          throw new Error(`Repository '${opts.repo}' not found in config.`);
        }
      } else if (!opts.all) {
        throw new Error('Specify --repo <name> or --all');
      }

      targets = targets.filter((r) => !cfg.ignores?.includes(r.name));

      if (targets.length === 0) {
        throw new Error('No matching repositories. Add them to config.');
      }

      for (const r of targets) {
        if (!(await fs.pathExists(r.path))) {
          console.warn(`[skip] ${r.name}: path not found ${r.path}`);
          continue;
        }
        
        console.log(`[remote][${r.name}] checking remote URL...`);
        try {
          const git = simpleGit({
            baseDir: path.resolve(r.path),
            config: ['credential.helper=manager-core']
          });

          // Get current remote URL
          const remotes = await git.getRemotes(true);
          const origin = remotes.find(remote => remote.name === 'origin');
          
          if (!origin) {
            console.warn(`[remote][${r.name}] no origin remote found`);
            continue;
          }

          console.log(`[remote][${r.name}] current URL: ${origin.refs.fetch}`);

          // Compute expected URL from repo.remote or workspace pattern
          const expectedUrl = computeExpectedUrl(r);
          if (!expectedUrl) {
            console.log(`[remote][${r.name}] no expected URL (no pattern and no repo.remote.url) - keeping current: ${origin.refs.fetch}`);
          } else {
            console.log(`[remote][${r.name}] expected URL: ${expectedUrl}`);
            if (origin.refs.fetch !== expectedUrl) {
              console.warn(`[remote][${r.name}] URL mismatch!`);
              if (opts.fix) {
                console.log(`[remote][${r.name}] fixing remote URL...`);
                await git.remote(['set-url', 'origin', expectedUrl]);
                console.log(`[remote][${r.name}] remote URL fixed to: ${expectedUrl}`);
              } else {
                console.log(`[remote][${r.name}] use --fix to correct the URL`);
              }
            } else {
              console.log(`[remote][${r.name}] URL is correct`);
            }
          }
        } catch (err: any) {
          if (opts.all) {
            console.error(`[error][remote][${r.name}] ${err?.message ?? err}`);
            continue;
          }
          throw err;
        }
      }
    });

  return cmd;
}

function computeExpectedUrl(repo: any): string | null {
  return repo.remote?.url ?? null;
}
