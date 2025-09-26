import { Command } from 'commander';
import { getConfig, getActiveWorkspaceName, setActiveWorkspace, saveConfig } from '../lib/config.js';

export function workspaceCommand() {
  const cmd = new Command('workspace').description('Manage workspaces (list/current/set)');

  cmd
    .command('list')
    .description('List available workspaces')
    .action(() => {
      const cfg = getConfig();
      const ws = Object.keys(cfg.workspaces ?? {});
      if (ws.length === 0) {
        console.log('No named workspaces defined. Using single-workspace mode.');
        return;
      }
      ws.forEach((n) => console.log(n));
    });

  cmd
    .command('current')
    .description('Show current workspace')
    .action(() => {
      console.log(getActiveWorkspaceName() ?? 'develop');
    });

  cmd
    .command('use <name>')
    .description('Set active workspace for current CLI session')
    .action(async (name: string) => {
      setActiveWorkspace(name);
      console.log(`Workspace set to: ${name}`);
    });

  cmd
    .command('set-default <name>')
    .description('Set defaultWorkspace in config file')
    .action(async (name: string) => {
      const cfg = getConfig();
      
      // Validate that the workspace exists
      if (cfg.workspaces && !cfg.workspaces[name]) {
        throw new Error(`Workspace '${name}' not found. Available: ${Object.keys(cfg.workspaces).join(', ')}`);
      }
      
      const next = { ...cfg, defaultWorkspace: name } as any;
      const out = await saveConfig(next);
      console.log(`defaultWorkspace updated to '${name}' in ${out}`);
    });

  cmd
    .command('move <name> <to>')
    .description('Move a repo to another workspace (by name)')
    .action(async (repoName: string, to: string) => {
      const cfg = getConfig();
      if (!cfg.workspaces) {
        console.error('No named workspaces defined in config.');
        return;
      }
      const fromName = Object.keys(cfg.workspaces).find((ws) => cfg.workspaces![ws].repos.some((r) => r.name === repoName));
      if (!fromName) {
        console.error(`Repo not found in any workspace: ${repoName}`);
        return;
      }
      const from = cfg.workspaces[fromName];
      const toWs = cfg.workspaces[to];
      if (!toWs) {
        console.error(`Target workspace not found: ${to}`);
        return;
      }
      const repo = from.repos.find((r) => r.name === repoName)!;
      from.repos = from.repos.filter((r) => r.name !== repoName);
      toWs.repos = [...toWs.repos, repo];
      const out = await saveConfig(cfg as any);
      console.log(`Moved '${repoName}' from '${fromName}' to '${to}' in ${out}`);
    });

              // Removed set-remote: per-repo remote.url should be used instead

  return cmd;
}


