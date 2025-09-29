import { Command } from 'commander';
import path from 'node:path';
import fs from 'fs-extra';
import fg from 'fast-glob';
import { getActiveConfig, saveConfig } from '../lib/config.js';
import { isGitRepo } from '../lib/utils.js';

export function scanCommand() {
  const cmd = new Command('scan')
    .description('Scan workspace for git repositories')
    .option('-r, --root <path>', 'workspace root to scan (defaults to current directory)')
    .option('-t, --target-workspace <name>', 'target workspace to add repos to (defaults to defaultWorkspace)')
    .option('--write', 'write discovered repos back to config')
    .action(async (opts: { root?: string; targetWorkspace?: string; write?: boolean }) => {
      // Get the full config to access workspaces
      const { getConfig } = await import('../lib/config.js');
      const cfgAll = getConfig();
      
      // Determine scan root
      const scanRoot = opts.root ? path.resolve(opts.root) : process.cwd();
      if (!(await fs.pathExists(scanRoot))) throw new Error(`Scan root not found: ${scanRoot}`);

      // Determine target workspace
      const targetWorkspace = opts.targetWorkspace ?? cfgAll.defaultWorkspace ?? 'develop';
      
      console.log(`Scanning: ${scanRoot}`);
      console.log(`Target workspace: ${targetWorkspace}`);

      const dirs = await fg(['**/'], {
        cwd: scanRoot,
        onlyDirectories: true,
        deep: 3,
        dot: false
      });

      const repos: Array<{ name: string; path: string }> = [];
      for (const rel of dirs) {
        const full = path.join(scanRoot, rel);
        if (await isGitRepo(full)) {
          repos.push({ name: path.basename(full), path: full });
        }
      }

      if (repos.length === 0) {
        console.log('No git repositories found.');
        return;
      }

      console.log(`Found ${repos.length} repositories:`);
      for (const r of repos) console.log(`- ${r.name}  ${r.path}`);

      if (opts.write && repos.length > 0) {
        if (!cfgAll.workspaces) {
          throw new Error('Multi-workspace mode not enabled. Use init command to set up workspaces.');
        }

        if (!cfgAll.workspaces[targetWorkspace]) {
          throw new Error(`Target workspace '${targetWorkspace}' not found. Available: ${Object.keys(cfgAll.workspaces).join(', ')}`);
        }

        // Merge discovered repos into target workspace
        const target = cfgAll.workspaces[targetWorkspace];
        const existing = new Map(target.repos.map((r) => [path.resolve(r.path), r]));
        
        let addedCount = 0;
        for (const repo of repos) {
          const repoPath = path.resolve(repo.path);
          if (!existing.has(repoPath)) {
            existing.set(repoPath, { name: repo.name, path: repo.path });
            addedCount++;
          }
        }

        if (addedCount > 0) {
          target.repos = Array.from(existing.values());
          const out = await saveConfig(cfgAll as any);
          console.log(`Added ${addedCount} repositories to workspace '${targetWorkspace}'`);
          console.log(`Config updated: ${out}`);
        } else {
          console.log('All repositories already exist in target workspace.');
        }
      }
    });

  return cmd;
}


