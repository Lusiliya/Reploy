import { cosmiconfig } from 'cosmiconfig';
import path from 'node:path';
import fs from 'fs-extra';
import { z } from 'zod';
import os from 'node:os';

const RepoSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(['frontend', 'backend']).optional(),
  packageManager: z.enum(['yarn', 'npm', 'pnpm']).optional(),
  dotnet: z.object({ solution: z.string().optional() }).optional(),
  java: z.object({ buildTool: z.enum(['maven', 'gradle']).optional() }).optional(),
  // Remote settings per-repo: explicit URL only (no inference)
  remote: z
    .object({
      url: z.string()
    })
    .optional(),
  demo: z.object({ start: z.string() }).optional(),
  integration: z.object({ start: z.string() }).optional()
});

const WorkspaceSchema = z.object({
  workspace: z.string().optional(),
  concurrency: z.number().int().positive().max(32).default(6),
  repos: z.array(RepoSchema).default([]),
  ignores: z.array(z.string()).default([]),
  // Removed: all remote configuration should be set per-repo via remote.url
  pipelines: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        steps: z.array(
          z.union([
            z.string(), // Simple command string
            z.object({
              name: z.string(),
              commands: z.array(
                z.union([
                  z.string(), // Simple command string
                  z.object({
                    repo: z.string().optional(),
                    path: z.string().optional(),
                    command: z.string(),
                    cwd: z.string().optional(),
                    openWindow: z.boolean().optional(),
                    wait: z.boolean().optional()
                  })
                ])
              ),
              parallel: z.boolean().default(false),
              openWindow: z.boolean().optional(), // Step-level openWindow setting
              waitFor: z.array(z.string()).optional() // Step names to wait for
            })
          ])
        )
      })
    )
    .default([])
});

const ConfigSchema = WorkspaceSchema.extend({
  // Optional multi-workspace support
  workspaces: z.record(WorkspaceSchema).optional(),
  defaultWorkspace: z.string().optional(),
  // Global pipelines that are available regardless of workspace
  pipelines: WorkspaceSchema.shape.pipelines.optional()
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export type WorkspaceConfig = z.infer<typeof WorkspaceSchema>;

let loadedConfig: AppConfig | null = null;
let loadedPath: string | null = null;
let activeWorkspace: string | null = null;

export async function loadConfig(explicitPath?: string): Promise<AppConfig> {
  if (loadedConfig) return loadedConfig;
  let result: AppConfig = { workspace: process.cwd(), concurrency: 6, repos: [], pipelines: [], ignores: [] } as AppConfig;
  const explorer = cosmiconfig('reploy');
  const envPath = process.env.REPLOY_CONFIG;
  if (explicitPath || envPath) {
    const chosen = explicitPath ?? envPath!;
    const abs = path.isAbsolute(chosen) ? chosen : path.resolve(process.cwd(), chosen);
    if (await fs.pathExists(abs)) {
      const raw = await fs.readFile(abs, 'utf-8');
      const parsed = JSON.parse(raw);
      result = ConfigSchema.parse(parsed);
      loadedConfig = result;
      loadedPath = abs;
      return result;
    }
  }

  // Direct fallback: reploy.config.json in CWD
  const direct = path.resolve(process.cwd(), 'reploy.config.json');
  if (await fs.pathExists(direct)) {
    const raw = await fs.readFile(direct, 'utf-8');
    const parsed = JSON.parse(raw);
    result = ConfigSchema.parse(parsed);
    loadedConfig = result;
    loadedPath = direct;
    return result;
  }

  const search = await explorer.search();
  if (search?.config) {
    result = ConfigSchema.parse(search.config);
    loadedPath = search.filepath ?? null;
  }

  loadedConfig = result;
  return result;
}

export function getConfig(): AppConfig {
  if (!loadedConfig) throw new Error('Config not loaded');
  return loadedConfig;
}

export function getConfigPath(): string | null {
  return loadedPath;
}

export async function saveConfig(cfg: AppConfig, targetPath?: string): Promise<string> {
  const outPath = targetPath
    ? path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath)
    : loadedPath ?? path.resolve(process.cwd(), 'reploy.config.json');
  await fs.writeFile(outPath, JSON.stringify(cfg, null, 2));
  loadedConfig = cfg;
  loadedPath = outPath;
  return outPath;
}

// Workspace selection and state persistence
function stateFilePath(): string {
  const home = os.homedir();
  const dir = path.join(home, '.reploy');
  fs.ensureDirSync(dir);
  return path.join(dir, 'state.json');
}

export async function loadLastWorkspaceFromState(): Promise<string | null> {
  try {
    const p = stateFilePath();
    if (!(await fs.pathExists(p))) return null;
    const raw = await fs.readFile(p, 'utf-8');
    const s = JSON.parse(raw) as { lastWorkspace?: string };
    return s.lastWorkspace ?? null;
  } catch {
    return null;
  }
}

export async function saveLastWorkspaceToState(name: string): Promise<void> {
  try {
    await fs.writeFile(stateFilePath(), JSON.stringify({ lastWorkspace: name }, null, 2));
  } catch {
    // ignore
  }
}

export function setActiveWorkspace(name: string | null) {
  activeWorkspace = name;
}

export function getActiveWorkspaceName(): string | null {
  return activeWorkspace;
}

export function getActiveConfig(): WorkspaceConfig {
  if (!loadedConfig) throw new Error('Config not loaded');
  const wsMap = loadedConfig.workspaces;
  if (!wsMap) {
    // single workspace mode: treat top-level as the active workspace
    return {
      workspace: loadedConfig.workspace,
      concurrency: loadedConfig.concurrency,
      repos: loadedConfig.repos,
      ignores: loadedConfig.ignores,
      pipelines: loadedConfig.pipelines ?? []
    };
  }
  const desired = activeWorkspace ?? loadedConfig.defaultWorkspace ?? 'develop';
  const picked = wsMap[desired] ?? wsMap['develop'] ?? Object.values(wsMap)[0];
  if (!picked) {
    // fallback to empty workspace view
    return { workspace: process.cwd(), concurrency: 6, repos: [], ignores: [], pipelines: [] };
  }
  return picked;
}


