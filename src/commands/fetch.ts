import { Command } from 'commander';
import simpleGit from 'simple-git';
import path from 'node:path';
import fs from 'fs-extra';
import { getActiveConfig } from '../lib/config.js';

export function fetchCommand() {
  const cmd = new Command('fetch')
    .description('Fetch latest refs from remote repositories')
    .option('-r, --repo <name>', 'repository name')
    .option('-a, --all', 'fetch all configured repos (respects ignores)')
    .action(async (opts: { repo?: string; all?: boolean }) => {
      const cfg = getActiveConfig();
      
      if (opts.all) {
        const targets = cfg.repos.filter((r) => !cfg.ignores?.includes(r.name));
        for (const r of targets) {
          if (!(await fs.pathExists(r.path))) {
            console.warn(`[skip] ${r.name}: path not found ${r.path}`);
            continue;
          }
          
          console.log(`[fetch][${r.name}] fetching from remote`);
          try {
            const git = simpleGit({ 
              baseDir: path.resolve(r.path),
              config: ['credential.helper=manager-core']
            });
            
            // Set remote URL if pattern is configured
            if ((r as any).remote?.url) {
              const remoteUrl = (r as any).remote.url as string;
              await git.remote(['set-url', 'origin', remoteUrl]);
            }
            
            await git.fetch();
          } catch (err: any) {
            console.error(`[error][fetch][${r.name}] ${err?.message ?? err}`);
          }
        }
        return;
      }
      
      if (!opts.repo) {
        throw new Error('Specify --repo <name> or --all');
      }
      
      const r = cfg.repos.find((x) => x.name.toLowerCase() === opts.repo!.toLowerCase());
      if (!r) throw new Error('Repository not found in config');
      if (cfg.ignores?.includes(r.name)) {
        console.log(`[fetch] skipped ignored repo: ${r.name}`);
        return;
      }
      
      const repoPath = path.resolve(r.path);
      if (!(await fs.pathExists(repoPath))) {
        throw new Error(`Repository path not found: ${repoPath}`);
      }
      
      console.log(`[fetch][${r.name}] fetching from remote`);
      const git = simpleGit({ 
        baseDir: repoPath,
        config: ['credential.helper=manager-core']
      });
      
      // Set remote URL if pattern is configured
      if ((r as any).remote?.url) {
        const remoteUrl = (r as any).remote.url as string;
        await git.remote(['set-url', 'origin', remoteUrl]);
      }
      
      await git.fetch();
    });
    
  return cmd;
}
