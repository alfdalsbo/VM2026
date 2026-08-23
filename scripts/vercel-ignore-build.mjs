import { execFileSync } from 'node:child_process';

export const vercelProductInputs = [
  /^src\//,
  /^public\//,
  /^scripts\/clean-next-dev-types\.mjs$/,
  /^next\.config\.(?:js|mjs|ts)$/,
  /^postcss\.config\.(?:js|mjs|ts)$/,
  /^tsconfig\.json$/,
  /^package(?:-lock)?\.json$/,
  /^vercel\.json$/,
  /^\.nvmrc$/,
  /^\.node-version$/,
];

export function canSkipVercelBuild(changedFiles) {
  return Array.isArray(changedFiles)
    && changedFiles.length > 0
    && changedFiles.every((file) => !vercelProductInputs.some((pattern) => pattern.test(file)));
}

function changedFilesForTriggeringCommit() {
  try {
    return execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

const invokedAsScript = process.argv[1]?.endsWith('vercel-ignore-build.mjs');
if (invokedAsScript) {
  const changed = changedFilesForTriggeringCommit();
  // Vercel: exit 0 = skip deployment, exit 1 = build. Git uncertainty builds safely.
  process.exit(changed && canSkipVercelBuild(changed) ? 0 : 1);
}
