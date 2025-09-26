import { Command } from 'commander';
import simpleGit from 'simple-git';
import path from 'node:path';
import fs from 'fs-extra';
import { getActiveConfig } from '../lib/config.js';

export function pullCommand() {
  const cmd = new Command('pull')
    .description('Git pull for a specific repo or all configured repos')
    .option('-r, --repo <name>', 'repository name (from config)')
    .option('-a, --all', 'pull all repos from config')
    .action(async (opts: { repo?: string; all?: boolean }) => {
      const cfg = getActiveConfig();
      if (!opts.all && !opts.repo) throw new Error('Specify --repo <name> or --all');
      const baseTargets = opts.all
        ? cfg.repos
        : cfg.repos.filter((r) => r.name.toLowerCase() === (opts.repo ?? '').toLowerCase());
      const targets = baseTargets.filter((r) => !cfg.ignores?.includes(r.name));
      if (targets.length === 0) throw new Error('No matching repositories. Add them to config.');

      for (const r of targets) {
        if (!(await fs.pathExists(r.path))) {
          console.warn(`[skip] ${r.name}: path not found ${r.path}`);
          continue;
        }
        console.log(`[pull][${r.name}] git fetch && git pull --ff-only`);
        try {
          const git = simpleGit({ 
            baseDir: path.resolve(r.path),
            config: ['credential.helper=manager-core'] // 确保使用 Git Credential Manager
          });
          
                      // Set remote URL if explicitly configured per repo
                      if ((r as any).remote?.url) {
                        const remoteUrl = (r as any).remote.url as string;
                        console.log(`[pull][${r.name}] setting remote origin to: ${remoteUrl}`);
                        await git.remote(['set-url', 'origin', remoteUrl]);
                      }
          
          // 使用交互式模式，让 Git Credential Manager 处理认证
          await git.fetch({ '--progress': null });
          await git.pull(["--ff-only"]);
        } catch (err: any) {
          if (opts.all) {
            console.error(`[error][pull][${r.name}] ${err?.message ?? err}`);
            continue;
          }
          throw err;
        }
      }
    });
  return cmd;
}


