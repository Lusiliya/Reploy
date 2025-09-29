import { Command } from 'commander';
import { getActiveConfig, getActiveWorkspaceName, getConfig } from '../lib/config.js';
import { execaCommand } from 'execa';
import { run } from '../lib/utils.js';
import path from 'node:path';
import { spawn } from 'node:child_process';

async function executeStep(step: any, cfg: any, activeWorkspace?: string) {
  if (typeof step === 'string') {
    // Simple command string - assume it's a reploy command
    console.log(`[pipeline] ${step}`);
    await executeInNewWindow(`reploy ${step}`, activeWorkspace);
  } else {
    // Complex step object
    console.log(`[pipeline] ${step.name}${step.parallel ? ' (parallel)' : ''}`);
    
    if (step.parallel) {
      // Execute commands in parallel and wait for all to finish
      const promises = step.commands.map(async (cmd: any) => {
        const { command, args, cwd, fullCommand, isReployCommand, openWindow: cmdOpenWindow } = parseCommand(cmd, cfg);
        // Use command-level openWindow if set, otherwise fall back to step-level openWindow
        const openWindow = cmdOpenWindow !== undefined ? cmdOpenWindow : (step.openWindow === true);
        if (openWindow) {
          if (isReployCommand) {
            const toRun = `reploy ${fullCommand}`;
            await executeInNewWindow(toRun, activeWorkspace, cwd);
          } else {
            // For non-reploy commands, execute directly in new window
            await executeInNewWindow(fullCommand ?? `${command} ${args.join(' ')}`, undefined, cwd);
          }
        } else {
          if (isReployCommand) {
            const toRun = fullCommand ?? `${command} ${args.join(' ')}`;
            await executeInlineReploy(toRun, activeWorkspace, cwd);
          } else {
            await run(command, args, cwd);
          }
        }
      });
      await Promise.all(promises);
    } else {
      // Execute commands sequentially
      for (const cmd of step.commands) {
        const { command, args, cwd, fullCommand, isReployCommand, openWindow: cmdOpenWindow } = parseCommand(cmd, cfg);
        // Use command-level openWindow if set, otherwise fall back to step-level openWindow
        const openWindow = cmdOpenWindow !== undefined ? cmdOpenWindow : (step.openWindow === true);
        if (openWindow) {
          if (isReployCommand) {
            const toRun = `reploy ${fullCommand}`;
            await executeInNewWindow(toRun, activeWorkspace, cwd);
          } else {
            // For non-reploy commands, execute directly in new window
            await executeInNewWindow(fullCommand ?? `${command} ${args.join(' ')}`, undefined, cwd);
          }
        } else {
          if (isReployCommand) {
            const toRun = fullCommand ?? `${command} ${args.join(' ')}`;
            await executeInlineReploy(toRun, activeWorkspace, cwd);
          } else {
            await run(command, args, cwd);
          }
        }
      }
    }
  }
}

function parseCommand(cmd: any, cfg: any) {
  if (typeof cmd === 'string') {
    // Simple string command
    const [command, ...args] = cmd.split(' ');
    const isReployCommand = ['fetch', 'pull', 'install', 'build', 'dev', 'demo', 'scan', 'branch'].includes(command);
    return { command, args, cwd: process.cwd(), fullCommand: cmd, isReployCommand, openWindow: false };
  } else {
    // Object command with repo and path info
    const { repo, path: cmdPath, command: cmdStr, cwd: explicitCwd, openWindow } = cmd;
    
    let targetCwd = explicitCwd || process.cwd();
    
    if (repo) {
      // Find repo in config
      const repoConfig = cfg.repos.find((r: any) => r.name.toLowerCase() === repo.toLowerCase());
      if (repoConfig) {
        targetCwd = cmdPath ? path.join(repoConfig.path, cmdPath) : repoConfig.path;
      } else {
        throw new Error(`Repository '${repo}' not found in config`);
      }
    } else if (cmdPath) {
      // Relative path from workspace
      targetCwd = path.resolve(cfg.workspace || process.cwd(), cmdPath);
    }
    
    const [command, ...args] = cmdStr.split(' ');
    const isReployCommand = ['fetch', 'pull', 'install', 'build', 'dev', 'demo', 'scan', 'branch'].includes(command);
    return { command, args, cwd: targetCwd, fullCommand: cmdStr, isReployCommand, openWindow };
  }
}

async function executeInNewWindow(command: string, workspace?: string, cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Build the full command with workspace parameter
    let fullCommand = command;
    if (workspace) {
      fullCommand = `${command} --workspace ${workspace}`;
    }
    
    const workingDir = cwd || process.cwd();
    const title = `Reploy Pipeline`;
    const echoStart = `echo [pipeline][START] %date% %time% && echo [pipeline] cwd: ${workingDir} && echo [pipeline] cmd: ${fullCommand}`;
    
    let runCmd: string;
    if (command.startsWith('reploy ')) {
      // Reploy command - use node to execute
      const reployPath = process.argv[1];
      const reployArgs = fullCommand.replace('reploy ', '');
      runCmd = `node "${reployPath}" ${reployArgs}`;
    } else {
      // System command - execute directly
      runCmd = fullCommand;
    }
    
    // Simplified command - just run the command and pause
    const composed = `${runCmd} & pause`;
    console.log(`[pipeline] Opening new window: ${fullCommand}`);
    console.log(`[pipeline] Working directory: ${workingDir}`);

    // Execute using argument array to avoid quoting pitfalls
    // Use start /D to set working dir and COMSPEC with /s /k for robust parsing
    const comspec = process.env.ComSpec || `${process.env.SystemRoot}\\System32\\cmd.exe`;
    const child = spawn('cmd', ['/d', '/c', 'start', '""', '/D', workingDir, comspec, '/s', '/k', composed], {
      cwd: workingDir,
      stdio: 'ignore',
      windowsHide: false,
      detached: true
    });
    
    child.on('error', (err) => {
      console.error(`[pipeline] Failed to open new window: ${err.message}`);
      reject(err);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Window command failed with code ${code}`));
      }
    });
    
    // Don't wait for the child process to finish since it opens a new window
    child.unref();
    resolve();
  });
}

async function executeInlineReploy(fullCommand: string, workspace?: string, cwd?: string): Promise<void> {
  // Execute reploy subcommand in the current console (no new window)
  const workingDir = cwd || process.cwd();
  const reployPath = process.argv[1];
  const tokens = fullCommand.split(' ').filter(Boolean);
  const args = [reployPath, ...tokens];
  if (workspace) {
    args.push('--workspace', workspace);
  }
  await run('node', args, workingDir);
}

export function pipelineCommand() {
  const cmd = new Command('pipeline')
    .description('Run a predefined pipeline from config')
    .command('run <name>')
    .action(async (name: string) => {
      const cfg = getActiveConfig();
      const activeWorkspace = getActiveWorkspaceName();
      const globalCfg = getConfig();
      const p = (cfg.pipelines.find((x) => x.name.toLowerCase() === name.toLowerCase())
        || (globalCfg.pipelines ?? []).find((x) => x.name.toLowerCase() === name.toLowerCase())) as any;
      if (!p) throw new Error('Pipeline not found');
      
      console.log(`[pipeline] Starting: ${p.name}${p.description ? ` - ${p.description}` : ''}`);
      if (activeWorkspace) {
        console.log(`[pipeline] Active workspace: ${activeWorkspace}`);
      }
      
      const failedSteps: string[] = [];
      
      for (const step of p.steps) {
        try {
          await executeStep(step, cfg, activeWorkspace || undefined);
        } catch (err: any) {
          const stepName = typeof step === 'string' ? step : step.name;
          console.error(`[pipeline][error] step failed: ${stepName}`);
          failedSteps.push(stepName);
          // Continue to next step instead of throwing
        }
      }
      
      if (failedSteps.length > 0) {
        console.log(`\n[pipeline] Pipeline completed with ${failedSteps.length} failed step(s):`);
        failedSteps.forEach((step, index) => {
          console.log(`  ${index + 1}. ${step}`);
        });
        console.log(`\n[pipeline] Total steps: ${p.steps.length}, Failed: ${failedSteps.length}, Success: ${p.steps.length - failedSteps.length}`);
      } else {
        console.log(`[pipeline] Completed: ${p.name}`);
        console.log(`[pipeline] All steps executed successfully`);
      }
    }).parent!;

  return cmd;
}


