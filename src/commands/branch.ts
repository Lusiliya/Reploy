import { Command } from 'commander';
import simpleGit from 'simple-git';
import path from 'node:path';
import fs from 'fs-extra';
import { getActiveConfig } from '../lib/config.js';

export function branchCommand() {
  const cmd = new Command('branch')
    .description('Switch repositories to specific branches')
    .option('-r, --repo <name>', 'repository name')
    .option('-a, --all', 'switch all configured repos (respects ignores)')
    .option('-b, --branch <name>', 'target branch name')
    .option('-d, --develop', 'switch to develop branch (shortcut)')
    .option('--release <version>', 'switch to release branch (shortcut, e.g., 9.0, 8.1)')
    .action(async (opts: { repo?: string; all?: boolean; branch?: string; develop?: boolean; release?: string }) => {
      // Determine target branch
      let targetBranch: string;
      if (opts.develop) {
        targetBranch = 'develop';
      } else if (opts.release) {
        targetBranch = `release/${opts.release}`;
      } else if (opts.branch) {
        targetBranch = opts.branch;
      } else {
        throw new Error('Specify --branch <name>, --develop, or --release <version>');
      }
      
      const cfg = getActiveConfig();
      
      if (opts.all) {
        const targets = cfg.repos.filter((r) => !cfg.ignores?.includes(r.name));
        for (const r of targets) {
          if (!(await fs.pathExists(r.path))) {
            console.warn(`[skip] ${r.name}: path not found ${r.path}`);
            continue;
          }
          
          console.log(`[branch][${r.name}] switching to ${targetBranch}`);
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
            
            // Fetch latest refs first
            await git.fetch();
            
            // Check if branch exists locally
            const branches = await git.branchLocal();
            const hasLocalBranch = branches.all.includes(targetBranch);
            
            if (hasLocalBranch) {
              // Switch to existing local branch
              await git.checkout(targetBranch);
              await git.pull('origin', targetBranch);
            } else {
              // Check if branch exists on remote
              const remoteBranches = await git.branch(['-r']);
              const hasRemoteBranch = remoteBranches.all.some(b => b.includes(`origin/${targetBranch}`));
              
              if (hasRemoteBranch) {
                // Create and checkout new local branch tracking remote
                await git.checkout(['-b', targetBranch, `origin/${targetBranch}`]);
              } else {
                console.warn(`[branch][${r.name}] branch '${targetBranch}' not found on remote`);
              }
            }
          } catch (err: any) {
            console.error(`[error][branch][${r.name}] ${err?.message ?? err}`);
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
        console.log(`[branch] skipped ignored repo: ${r.name}`);
        return;
      }
      
      const repoPath = path.resolve(r.path);
      if (!(await fs.pathExists(repoPath))) {
        throw new Error(`Repository path not found: ${repoPath}`);
      }
      
      console.log(`[branch][${r.name}] switching to ${targetBranch}`);
      const git = simpleGit({ 
        baseDir: repoPath,
        config: ['credential.helper=manager-core']
      });
      
      // Set remote URL if pattern is configured
                  if ((r as any).remote?.url) {
                    const remoteUrl = (r as any).remote.url as string;
                    await git.remote(['set-url', 'origin', remoteUrl]);
                  }
      
      // Fetch latest refs first
      await git.fetch();
      
      // Check if branch exists locally
      const branches = await git.branchLocal();
      const hasLocalBranch = branches.all.includes(targetBranch);
      
      if (hasLocalBranch) {
        // Switch to existing local branch
        await git.checkout(targetBranch);
        await git.pull('origin', targetBranch);
      } else {
        // Check if branch exists on remote
        const remoteBranches = await git.branch(['-r']);
        const hasRemoteBranch = remoteBranches.all.some(b => b.includes(`origin/${targetBranch}`));
        
        if (hasRemoteBranch) {
          // Create and checkout new local branch tracking remote
          await git.checkout(['-b', targetBranch, `origin/${targetBranch}`]);
        } else {
          throw new Error(`Branch '${targetBranch}' not found on remote`);
        }
      }
    });
    
  return cmd;
}
