import { Command } from 'commander';
import { getConfig, saveConfig } from '../lib/config.js';

export function ignoreCommand() {
  const cmd = new Command('ignore').description('Manage ignored repositories');

  cmd
    .command('add <name>')
    .description('Add a repo name to ignore list')
    .action(async (name: string) => {
      const cfg = getConfig();
      const set = new Set(cfg.ignores ?? []);
      set.add(name);
      const next = { ...cfg, ignores: Array.from(set) };
      const out = await saveConfig(next);
      console.log(`Ignored added: ${name}`);
      console.log(`Config updated: ${out}`);
    });

  cmd
    .command('remove <name>')
    .description('Remove a repo name from ignore list')
    .action(async (name: string) => {
      const cfg = getConfig();
      const set = new Set(cfg.ignores ?? []);
      set.delete(name);
      const next = { ...cfg, ignores: Array.from(set) };
      const out = await saveConfig(next);
      console.log(`Ignored removed: ${name}`);
      console.log(`Config updated: ${out}`);
    });

  cmd
    .command('list')
    .description('List ignored repositories')
    .action(async () => {
      const cfg = getConfig();
      (cfg.ignores ?? []).forEach((n) => console.log(n));
    });

  return cmd;
}


