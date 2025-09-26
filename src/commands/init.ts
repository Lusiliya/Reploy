import { Command } from 'commander';
import path from 'node:path';
import fs from 'fs-extra';
import { getConfig, loadConfig, saveConfig } from '../lib/config.js';
import { discoverRepos } from '../lib/discover.js';

export function initCommand() {
  const cmd = new Command('init')
    .description('Initialize reploy with default empty config or scan repositories')
    .option('-o, --output <path>', 'config output path (default reploy.config.json)')
    .option('-r, --root <path>', 'workspace root to scan (enables auto-discovery)')
    .option('-d, --depth <n>', 'directory scan depth', (v) => parseInt(v, 10), 3)
    .option('--merge', 'merge with existing config if present', true)
    .option('--full-scan', 'scan all drives for git repositories (Windows only)')
    .action(async (opts: { output?: string; root?: string; depth?: number; merge?: boolean; fullScan?: boolean }) => {
      const outputPath = opts.output ?? 'reploy.config.json';
      
      if (opts.fullScan) {
        // Full system scan for Windows
        console.log('Starting full system scan for git repositories...');
        const drives = await getWindowsDrives();
        const allRepos: any[] = [];
        
        for (const drive of drives) {
          console.log(`Scanning drive: ${drive}`);
          try {
            const repos = await discoverRepos(drive, 4); // Deeper scan for full system
            allRepos.push(...repos);
            console.log(`Found ${repos.length} repositories on ${drive}`);
          } catch (err) {
            console.warn(`Failed to scan ${drive}: ${err}`);
          }
        }
        
        // Group repositories by common parent directories
        const grouped = groupReposByParent(allRepos);
        
        // Create multi-workspace config
        const config = createMultiWorkspaceConfig(grouped);
        const outPath = await saveConfig(config, outputPath);
        
        console.log(`\nFull scan completed!`);
        console.log(`Found ${allRepos.length} total repositories`);
        console.log(`Created ${Object.keys(config.workspaces!).length} workspaces`);
        console.log(`Config written: ${outPath}`);
        return;
      }
      
      if (opts.root) {
        // Auto-discovery mode - create multi-workspace config
        const root = path.resolve(opts.root);
        if (!(await fs.pathExists(root))) throw new Error(`Workspace not found: ${root}`);

        const discovered = await discoverRepos(root, opts.depth ?? 3);
        
        // Group repositories by common parent directories
        const grouped = groupReposByParent(discovered);
        
        // Create multi-workspace config
        const config = createMultiWorkspaceConfig(grouped);
        const outPath = await saveConfig(config, outputPath);
        
        console.log(`Auto-discovery completed!`);
        console.log(`Found ${discovered.length} repositories`);
        console.log(`Created ${Object.keys(config.workspaces!).length} workspaces`);
        console.log(`Config written: ${outPath}`);
        return;
      }
      
      // Default: create empty multi-workspace config
      const emptyConfig = {
        defaultWorkspace: 'develop',
        workspaces: {
          develop: {
            workspace: process.cwd(),
            concurrency: 6,
            remoteUrlPattern: 'https://gitea.example.com/{project}/{name}.git',
            repos: [],
            ignores: [],
            pipelines: []
          },
          release: {
            workspace: process.cwd(),
            concurrency: 6,
            remoteUrlPattern: 'https://gitea.example.com/{project}/{name}.git',
            repos: [],
            ignores: [],
            pipelines: []
          }
        }
      };
      
      const outPath = await saveConfig(emptyConfig as any, outputPath);
      console.log(`Initialized empty reploy config: ${outPath}`);
      console.log(`Created workspaces: develop, release`);
      console.log(`Use 'reploy scan --write' to add repositories from current directory`);
      console.log(`Use 'reploy scan --root <path> --write' to scan specific directory`);
      console.log(`Use 'reploy init --full-scan' to scan all drives`);
    });

  return cmd;
}

async function getWindowsDrives(): Promise<string[]> {
  const { execa } = await import('execa');
  try {
    const { stdout } = await execa('wmic', ['logicaldisk', 'get', 'size,freespace,caption'], { shell: true });
    const drives = stdout
      .split('\n')
      .slice(1) // Skip header
      .map(line => line.trim())
      .filter(line => line && line.match(/^[A-Z]:/))
      .map(line => line.split(/\s+/)[0] + '\\');
    return drives;
  } catch {
    // Fallback to common drives
    return ['C:\\', 'D:\\', 'E:\\', 'F:\\'];
  }
}

function groupReposByParent(repos: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  
  for (const repo of repos) {
    // Group by the immediate parent directory name
    const parent = path.dirname(repo.path);
    const parentName = path.basename(parent);
    
    // Use meaningful workspace names
    let workspaceName = parentName;
    if (parentName === 'develop') {
      workspaceName = 'develop';
    } else if (parentName === 'release') {
      workspaceName = 'release';
    } else if (parentName === 'workspace') {
      workspaceName = 'main';
    } else if (parentName === '') {
      workspaceName = 'root';
    }
    
    if (!groups[workspaceName]) {
      groups[workspaceName] = [];
    }
    groups[workspaceName].push(repo);
  }
  
  return groups;
}

function createMultiWorkspaceConfig(grouped: Record<string, any[]>): any {
  const workspaces: Record<string, any> = {};
  
  for (const [name, repos] of Object.entries(grouped)) {
    // Determine workspace root directory
    let workspaceRoot = process.cwd();
    if (repos.length > 0) {
      const firstRepo = repos[0];
      const repoParent = path.dirname(firstRepo.path);
      workspaceRoot = path.dirname(repoParent); // Go up one level from repo parent
    }
    
    workspaces[name] = {
      workspace: workspaceRoot,
      concurrency: 6,
      remoteUrlPattern: 'https://code.wynenterprise.io/{name}/{name}.git',
      repos: repos.map(r => ({
        name: r.name,
        path: r.path,
        type: r.type,
        packageManager: r.packageManager
      })),
      ignores: [],
      pipelines: []
    };
  }
  
  // Set default workspace to 'develop' if it exists, otherwise first workspace
  const defaultWorkspace = grouped.develop ? 'develop' : Object.keys(workspaces)[0] || 'develop';
  
  return {
    defaultWorkspace,
    workspaces
  };
}


