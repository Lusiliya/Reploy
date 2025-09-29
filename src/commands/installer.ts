import { Command } from 'commander';
import path from 'node:path';
import fs from 'fs-extra';
import { getConfig } from '../lib/config.js';
import { spawn } from 'node:child_process';

export function installerCommand() {
  const cmd = new Command('installer')
    .description('Quick installer package manager - open latest installer from configured directories')
    .option('-l, --list', 'list all configured installers')
    .option('-n, --name <name>', 'installer name to open')
    .option('-i, --interactive', 'interactive mode to select installer')
    .action(async (opts: { list?: boolean; name?: string; interactive?: boolean }) => {
      const cfg = await getConfig();
      
      if (!cfg.installers || cfg.installers.length === 0) {
        console.log('No installers configured. Add installers to your reploy.config.json:');
        console.log(`
{
  "installers": [
    {
      "name": "Visual Studio",
      "directory": "C:\\\\installers\\\\vs",
      "pattern": "*.exe",
      "description": "Visual Studio installer"
    }
  ]
}`);
        return;
      }

      if (opts.list) {
        console.log('Configured installers:');
        cfg.installers.forEach((installer, index) => {
          console.log(`${index + 1}. ${installer.name}`);
          console.log(`   Directory: ${installer.directory}`);
          console.log(`   Pattern: ${installer.pattern || '*.*'}`);
          if (installer.description) {
            console.log(`   Description: ${installer.description}`);
          }
          console.log();
        });
        return;
      }

      if (opts.interactive) {
        await interactiveMode(cfg.installers);
        return;
      }

      if (opts.name) {
        const installer = cfg.installers.find(i => 
          i.name.toLowerCase() === opts.name!.toLowerCase()
        );
        if (!installer) {
          console.error(`Installer "${opts.name}" not found.`);
          console.log('Available installers:', cfg.installers.map(i => i.name).join(', '));
          return;
        }
        await openLatestInstaller(installer);
        return;
      }

      // Default: show available installers
      console.log('Available installers:');
      cfg.installers.forEach((installer, index) => {
        console.log(`${index + 1}. ${installer.name}`);
      });
      console.log('\nUse --name <name> to open a specific installer, or --interactive for selection mode.');
    });

  return cmd;
}

async function interactiveMode(installers: any[]) {
  const readline = await import('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('Select an installer:');
  installers.forEach((installer, index) => {
    console.log(`${index + 1}. ${installer.name}`);
    if (installer.description) {
      console.log(`   ${installer.description}`);
    }
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    const answer = await question('\nEnter number (1-' + installers.length + '): ');
    const index = parseInt(answer) - 1;
    
    if (index >= 0 && index < installers.length) {
      await openLatestInstaller(installers[index]);
    } else {
      console.log('Invalid selection.');
    }
  } finally {
    rl.close();
  }
}

async function openLatestInstaller(installer: any) {
  const { directory, pattern = '*.*', name } = installer;
  
  if (!await fs.pathExists(directory)) {
    console.error(`Directory does not exist: ${directory}`);
    return;
  }

  try {
    // Find all matching files
    const fg = await import('fast-glob');
    const files = await fg.default(pattern, { 
      cwd: directory,
      absolute: true,
      onlyFiles: true
    });

    if (files.length === 0) {
      console.log(`No files found matching pattern "${pattern}" in ${directory}`);
      return;
    }

    // Get file stats and sort by modification time (newest first)
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const stats = await fs.stat(file);
        return { file, mtime: stats.mtime };
      })
    );

    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    const latestFile = fileStats[0].file;

    console.log(`Opening latest ${name} installer: ${path.basename(latestFile)}`);
    console.log(`File: ${latestFile}`);
    console.log(`Modified: ${fileStats[0].mtime.toLocaleString()}`);

    // Open the file with default system handler
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    if (process.platform === 'win32') {
      await execAsync(`start "" "${latestFile}"`);
    } else if (process.platform === 'darwin') {
      await execAsync(`open "${latestFile}"`);
    } else {
      await execAsync(`xdg-open "${latestFile}"`);
    }

    console.log('Installer opened successfully!');

  } catch (error) {
    console.error('Error opening installer:', error);
  }
}
