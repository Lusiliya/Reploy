import { Command } from 'commander';
import path from 'node:path';
import { getActiveConfig } from '../lib/config.js';
import { detectPackageManager, run } from '../lib/utils.js';
import fs from 'fs-extra';
import fg from 'fast-glob';

export function installCommand() {
  const cmd = new Command('install')
    .description('Install dependencies for frontend or backend of a repo (or all)')
    .option('-r, --repo <name>', 'repository name')
    .option('-a, --all', 'install for all configured repos')
    .option('--frontend', 'install frontend deps (package.json)')
    .option('--backend', 'install backend deps (dotnet restore)')
    .action(async (opts: { repo?: string; all?: boolean; frontend?: boolean; backend?: boolean }) => {
      const cfg = getActiveConfig();
      const baseTargets = opts.all
        ? cfg.repos
        : cfg.repos.filter((r) => r.name.toLowerCase() === (opts.repo ?? '').toLowerCase());
      const targets = baseTargets.filter((r) => !cfg.ignores?.includes(r.name));
      if (targets.length === 0) throw new Error('No matching repositories');
      const doFrontend = opts.frontend ?? true;
      const doBackend = opts.backend ?? true;

      for (const r of targets) {
        const repoPath = path.resolve(r.path);
        if (doFrontend) {
          try {
            const yarnLock = await fs.pathExists(path.join(repoPath, 'yarn.lock'));
            if (yarnLock) {
              console.log(`[install][frontend][${r.name}] yarn install --frozen-lockfile`);
              await run('yarn', ['install', '--frozen-lockfile'], repoPath);
            } else {
              console.log(`[install][frontend][${r.name}] npm i`);
              await run('npm', ['i'], repoPath);
            }
          } catch (err: any) {
            if (opts.all) {
              console.error(`[error][install-frontend][${r.name}] ${err?.message ?? err}`);
            } else {
              throw err;
            }
          }
        }
        if (doBackend) {
          // Check for .NET projects
          const hasSln = (await fg(['*.sln', '**/*.sln'], { cwd: repoPath, onlyFiles: true, deep: 2 })).length > 0;
          if (hasSln) {
            console.log(`[install][backend][${r.name}] dotnet restore`);
            try {
              await run('dotnet', ['restore'], repoPath);
            } catch (err: any) {
              if (opts.all) {
                console.error(`[error][install-backend][${r.name}] ${err?.message ?? err}`);
              } else {
                throw err;
              }
            }
          }
          
          // Check for Java projects
          const hasPom = (await fg(['pom.xml'], { cwd: repoPath, onlyFiles: true })).length > 0;
          const hasGradle = (await fg(['build.gradle', 'build.gradle.kts'], { cwd: repoPath, onlyFiles: true })).length > 0;
          
          if (hasPom) {
            // Try Maven wrapper first, then Maven
            const mvnwPath = path.join(repoPath, 'mvnw.cmd');
            const mvnwExists = await fs.pathExists(mvnwPath);
            const mvnCommand = mvnwExists ? 'mvnw.cmd' : 'mvn';
            
            console.log(`[install][backend][${r.name}] ${mvnCommand} dependency:resolve`);
            try {
              await run(mvnCommand, ['dependency:resolve'], repoPath);
            } catch (err: any) {
              if (opts.all) {
                console.error(`[error][install-backend][${r.name}] ${err?.message ?? err}`);
              } else {
                throw err;
              }
            }
          } else if (hasGradle) {
            // Try Gradle wrapper first, then Gradle
            const gradlewPath = path.join(repoPath, 'gradlew.bat');
            const gradlewExists = await fs.pathExists(gradlewPath);
            const gradleCommand = gradlewExists ? 'gradlew.bat' : 'gradle';
            
            console.log(`[install][backend][${r.name}] ${gradleCommand} dependencies`);
            try {
              await run(gradleCommand, ['dependencies'], repoPath);
            } catch (err: any) {
              if (opts.all) {
                console.error(`[error][install-backend][${r.name}] ${err?.message ?? err}`);
              } else {
                throw err;
              }
            }
          } else if (!hasSln) {
            console.log(`[install][backend][${r.name}] skipped: no .sln, pom.xml, or build.gradle found`);
          }
        }
      }
    });
  return cmd;
}


