import assert from 'node:assert/strict';
import test from 'node:test';
import { canSkipVercelBuild } from './vercel-ignore-build.mjs';

test('Tippekjelleren bygger når publisert produkt eller runtime endres', () => {
  for (const file of [
    'src/app/page.tsx',
    'src/lib/db.ts',
    'public/avatars/Haaland.jpg',
    'scripts/clean-next-dev-types.mjs',
    'next.config.ts',
    'package.json',
    'package-lock.json',
    'vercel.json',
  ]) {
    assert.equal(canSkipVercelBuild([file]), false, `${file} må bygge`);
  }
});

test('arbeids-, dokumentasjons- og testendringer kan hoppe over Vercel', () => {
  for (const file of [
    'README.md',
    'AGENTS.md',
    'CONTRIBUTING.md',
    'docs/notat.md',
    'tests/tippekjelleren.spec.ts',
    'src/lib/sync-schedule.test.ts',
    'src/lib/world-cup-sync.spec.tsx',
    'playwright.config.ts',
    'scripts/analysis-context.mjs',
    '.github/workflows/verify.yml',
  ]) {
    assert.equal(canSkipVercelBuild([file]), true, `${file} skal kunne hoppe over`);
  }
});

test('blandet commit bygger hvis minst én produktfil er endret', () => {
  assert.equal(canSkipVercelBuild(['README.md', 'src/app/page.tsx']), false);
  assert.equal(canSkipVercelBuild(['README.md', 'tests/tippekjelleren.spec.ts']), true);
  assert.equal(canSkipVercelBuild(['README.md', 'src/lib/sync-schedule.test.ts']), true);
  assert.equal(canSkipVercelBuild([]), false);
});
