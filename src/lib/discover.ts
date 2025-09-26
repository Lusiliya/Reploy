import path from 'node:path';
import fs from 'fs-extra';
import fg from 'fast-glob';
import { isGitRepo, detectPackageManager } from './utils.js';

export interface DiscoveredRepo { 
  name: string; 
  path: string; 
  type?: 'frontend' | 'backend'; 
  packageManager?: 'yarn' | 'pnpm' | 'npm';
  java?: { buildTool?: 'maven' | 'gradle' };
}

export async function discoverRepos(root: string, depth = 3): Promise<DiscoveredRepo[]> {
  const dirs = await fg(['**/'], { cwd: root, onlyDirectories: true, deep: depth, dot: false });
  const results: DiscoveredRepo[] = [];
  for (const rel of dirs) {
    const full = path.join(root, rel);
    if (await isGitRepo(full)) {
      const pm = detectPackageManager(full);
      const isFrontend = await fs.pathExists(path.join(full, 'package.json'));
      const isDotNetBackend = (await fg(['*.sln', '*.csproj'], { cwd: full, onlyFiles: true, deep: 1 })).length > 0;
      const isJavaBackend = (await fg(['pom.xml', 'build.gradle', 'build.gradle.kts'], { cwd: full, onlyFiles: true, deep: 1 })).length > 0;
      
      // Determine Java build tool
      let javaConfig;
      if (isJavaBackend) {
        const hasPom = await fs.pathExists(path.join(full, 'pom.xml'));
        const hasGradle = await fs.pathExists(path.join(full, 'build.gradle')) || await fs.pathExists(path.join(full, 'build.gradle.kts'));
        javaConfig = {
          buildTool: hasPom ? 'maven' as const : hasGradle ? 'gradle' as const : undefined
        };
      }
      
      const isBackend = isDotNetBackend || isJavaBackend;
      results.push({
        name: path.basename(full),
        path: full,
        type: isFrontend && !isBackend ? 'frontend' : isBackend && !isFrontend ? 'backend' : undefined,
        packageManager: isFrontend ? pm : undefined,
        java: javaConfig
      });
    }
  }
  return results;
}


