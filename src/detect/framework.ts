export interface FrameworkInfo {
  name: string;       // 'express' | 'fastify' | 'koa' | 'hapi' | 'nestjs' | 'next' | 'none'
  version: string;    // resolved version or ''
  detected: boolean;
}

const FRAMEWORKS = [
  { name: 'next',    moduleName: 'next',           packageName: 'next' },
  { name: 'nestjs',  moduleName: '@nestjs/core',   packageName: '@nestjs/core' },
  { name: 'fastify', moduleName: 'fastify',        packageName: 'fastify' },
  { name: 'express', moduleName: 'express',        packageName: 'express' },
  { name: 'koa',     moduleName: 'koa',            packageName: 'koa' },
  { name: 'hapi',    moduleName: '@hapi/hapi',     packageName: '@hapi/hapi' },
] as const;

let cachedResult: FrameworkInfo | null = null;

export function detectFramework(): FrameworkInfo {
  if (cachedResult) return cachedResult;

  // Method 1: Scan require.cache for loaded framework modules
  const cache = require.cache || {};
  for (const fw of FRAMEWORKS) {
    for (const key of Object.keys(cache)) {
      if (key.includes(`/node_modules/${fw.moduleName}/`) || key.includes(`\\node_modules\\${fw.moduleName}\\`)) {
        const version = resolveVersion(fw.packageName);
        cachedResult = { name: fw.name, version, detected: true };
        return cachedResult;
      }
    }
  }

  // Method 2: Try require.resolve (checks if installed, even if not yet loaded)
  for (const fw of FRAMEWORKS) {
    try {
      require.resolve(fw.moduleName);
      const version = resolveVersion(fw.packageName);
      cachedResult = { name: fw.name, version, detected: true };
      return cachedResult;
    } catch {
      // Not installed
    }
  }

  cachedResult = { name: 'none', version: '', detected: false };
  return cachedResult;
}

function resolveVersion(packageName: string): string {
  try {
    const pkgPath = require.resolve(`${packageName}/package.json`);
    const pkg = require(pkgPath);
    return pkg.version || '';
  } catch {
    return '';
  }
}

/** Re-scan on next call (useful after lazy imports) */
export function resetFrameworkCache(): void {
  cachedResult = null;
}
