#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig, getConfig, setActiveWorkspace } from './lib/config.js';
import { scanCommand } from './commands/scan.js';
import { pullCommand } from './commands/pull.js';
import { installCommand } from './commands/install.js';
import { buildCommand } from './commands/build.js';
import { devCommand } from './commands/dev.js';
import { pipelineCommand } from './commands/pipeline.js';
import { demoCommand } from './commands/demo.js';
import { initCommand } from './commands/init.js';
import { ignoreCommand } from './commands/ignore.js';
import { workspaceCommand } from './commands/workspace.js';
import { branchCommand } from './commands/branch.js';
import { fetchCommand } from './commands/fetch.js';
import { remoteCommand } from './commands/remote.js';

const program = new Command();

program
  .name('reploy')
  .description('Reploy - workspace repo manager')
  .version('0.1.0');

program
  .option('-c, --config <path>', 'path to config file')
  .option('-w, --workspace <name>', 'workspace name (e.g., develop, release)');

program.hook('preAction', async (thisCommand, actionCommand) => {
  const opts = thisCommand.opts<{ config?: string; workspace?: string }>();
  await loadConfig(opts.config);
  const cfg = getConfig();
  const requested = opts.workspace;
  if (requested) {
    setActiveWorkspace(requested);
  } else {
    setActiveWorkspace(cfg.defaultWorkspace ?? 'develop');
  }
});

program.addCommand(scanCommand());
program.addCommand(pullCommand());
program.addCommand(installCommand());
program.addCommand(buildCommand());
program.addCommand(devCommand());
program.addCommand(pipelineCommand());
program.addCommand(demoCommand());
program.addCommand(initCommand());
program.addCommand(ignoreCommand());
program.addCommand(workspaceCommand());
program.addCommand(branchCommand());
program.addCommand(fetchCommand());
program.addCommand(remoteCommand());

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});


