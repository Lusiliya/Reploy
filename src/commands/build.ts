import { Command } from 'commander';
import path from 'node:path';
import { getActiveConfig } from '../lib/config.js';
import { detectPackageManager, run } from '../lib/utils.js';
import fg from 'fast-glob';
import fs from 'fs-extra';

export function buildCommand() {
  const cmd = new Command('build')
    .description('Build frontend or backend of a repo')
    .option('-r, --repo <name>', 'repository name')
    .option('-a, --all', 'build all configured repos (respects ignores)')
    .option('--frontend', 'build frontend (yarn/npm run build)')
    .option('--backend', 'build backend (dotnet build)')
    .action(async (opts: { repo?: string; all?: boolean; frontend?: boolean; backend?: boolean }) => {
      const cfg = getActiveConfig();
      const doFrontend = opts.frontend ?? true;
      const doBackend = opts.backend ?? true;

      if (opts.all) {
        const targets = cfg.repos.filter((r) => !cfg.ignores?.includes(r.name));
        for (const r of targets) {
          const repoPath = path.resolve(r.path);
          if (doFrontend) {
            const pm = r.packageManager ?? detectPackageManager(repoPath);
            console.log(`[build][frontend][${r.name}] ${pm} run build`);
            try {
              await run(pm, ['run', 'build'], repoPath);
            } catch (err: any) {
              console.error(`[error][build-frontend][${r.name}] ${err?.message ?? err}`);
            }
          }
          if (doBackend) {
            // Check for .NET projects
            const hasSln = (await fg(['*.sln', '**/*.sln'], { cwd: repoPath, onlyFiles: true, deep: 2 })).length > 0;
            if (hasSln) {
              console.log(`[build][backend][${r.name}] dotnet build -c Release`);
              try {
                await run('dotnet', ['build', '-c', 'Release'], repoPath);
              } catch (err: any) {
                console.error(`[error][build-backend][${r.name}] ${err?.message ?? err}`);
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
              
              console.log(`[build][backend][${r.name}] ${mvnCommand} clean package -DskipTests`);
              try {
                await run(mvnCommand, ['clean', 'package', '-DskipTests'], repoPath);
              } catch (err: any) {
                console.error(`[error][build-backend][${r.name}] ${err?.message ?? err}`);
              }
            } else if (hasGradle) {
              // Try Gradle wrapper first, then Gradle
              const gradlewPath = path.join(repoPath, 'gradlew.bat');
              const gradlewExists = await fs.pathExists(gradlewPath);
              const gradleCommand = gradlewExists ? 'gradlew.bat' : 'gradle';
              
              console.log(`[build][backend][${r.name}] ${gradleCommand} build -x test`);
              try {
                await run(gradleCommand, ['build', '-x', 'test'], repoPath);
              } catch (err: any) {
                console.error(`[error][build-backend][${r.name}] ${err?.message ?? err}`);
              }
            } else if (!hasSln) {
              console.log(`[build][backend][${r.name}] skipped: no .sln, pom.xml, or build.gradle found`);
            }
          }
        }
        return;
      }

      const r = cfg.repos.find((x) => x.name.toLowerCase() === (opts.repo ?? '').toLowerCase());
      if (!r) throw new Error('Repository not found in config');
      if (cfg.ignores?.includes(r.name)) {
        console.log(`[build] skipped ignored repo: ${r.name}`);
        return;
      }
      const repoPath = path.resolve(r.path);

      if (doFrontend) {
        const pm = r.packageManager ?? detectPackageManager(repoPath);
        console.log(`[build][frontend][${r.name}] ${pm} run build`);
        await run(pm, ['run', 'build'], repoPath);
      }
      if (doBackend) {
        // Check for .NET projects
        const hasSln = (await fg(['*.sln', '**/*.sln'], { cwd: repoPath, onlyFiles: true, deep: 2 })).length > 0;
        if (hasSln) {
          console.log(`[build][backend][${r.name}] dotnet build -c Release`);
          await run('dotnet', ['build', '-c', 'Release'], repoPath);
        }
        
        // Check for Java projects
        const hasPom = (await fg(['pom.xml'], { cwd: repoPath, onlyFiles: true })).length > 0;
        const hasGradle = (await fg(['build.gradle', 'build.gradle.kts'], { cwd: repoPath, onlyFiles: true })).length > 0;
        
        if (hasPom) {
          // Try Maven wrapper first, then Maven
          const mvnwPath = path.join(repoPath, 'mvnw.cmd');
          const mvnwExists = await fs.pathExists(mvnwPath);
          const mvnCommand = mvnwExists ? 'mvnw.cmd' : 'mvn';
          
          console.log(`[build][backend][${r.name}] ${mvnCommand} clean package -DskipTests`);
          await run(mvnCommand, ['clean', 'package', '-DskipTests'], repoPath);
        } else if (hasGradle) {
          // Try Gradle wrapper first, then Gradle
          const gradlewPath = path.join(repoPath, 'gradlew.bat');
          const gradlewExists = await fs.pathExists(gradlewPath);
          const gradleCommand = gradlewExists ? 'gradlew.bat' : 'gradle';
          
          console.log(`[build][backend][${r.name}] ${gradleCommand} build -x test`);
          await run(gradleCommand, ['build', '-x', 'test'], repoPath);
        } else if (!hasSln) {
          console.log(`[build][backend][${r.name}] skipped: no .sln, pom.xml, or build.gradle found`);
        }
      }
    });
  return cmd;
}


