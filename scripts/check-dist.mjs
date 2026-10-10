// Asserts the published build is shaped the way the README promises. Runs at the end of `build`,
// so `prepublishOnly` fails before a broken package reaches npm. No CI covers this package.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import process from 'node:process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const failures = [];
const fail = (message) => failures.push(message);

const ENTRY_FILES = ['dist/index.js', 'dist/index.cjs'];
const REQUIRED_IMPORTS = ['react', '@bugdump/sdk'];
const ALLOWED_IMPORTS = new Set([...REQUIRED_IMPORTS, 'react/jsx-runtime']);

// 1. Every file the exports map names exists.
function exportTargets(value) {
  if (typeof value === 'string') return [value];
  return Object.values(value).flatMap(exportTargets);
}
for (const target of exportTargets(pkg.exports)) {
  if (!existsSync(target)) fail(`exports names a missing file: ${target}`);
}

for (const file of ENTRY_FILES) {
  const code = readFileSync(file, 'utf8');

  // 2. Every export is client-only, so both formats start with the directive.
  if (!/^(["'])use client\1/.test(code) && !/^"use strict";\s*"use client"/.test(code)) {
    fail(`${file} does not start with 'use client'`);
  }

  // 3. React and the SDK stay external. A bundled copy of the SDK would carry its own singleton,
  // which neither the provider nor the boundary would ever see.
  const specifiers = new Set(
    [
      ...code.matchAll(/\bfrom\s*["']([^"']+)["']/g),
      ...code.matchAll(/\bimport\s*["']([^"']+)["']/g),
      ...code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g),
    ].map((match) => match[1]),
  );
  for (const specifier of specifiers) {
    if (!ALLOWED_IMPORTS.has(specifier)) fail(`${file} imports ${specifier}`);
  }
  for (const specifier of REQUIRED_IMPORTS) {
    if (!specifiers.has(specifier)) fail(`${file} does not import ${specifier}`);
  }
}

// 4. @bugdump/react is released together with @bugdump/sdk, at the same version.
const peerFloor = /^>=(\S+)/.exec(pkg.peerDependencies?.['@bugdump/sdk'] ?? '')?.[1];
if (peerFloor !== pkg.version) {
  fail(`the @bugdump/sdk peer floor (${peerFloor}) is not the package version (${pkg.version})`);
}
const sdkDevDependency = pkg.devDependencies?.['@bugdump/sdk'];
if (sdkDevDependency !== 'workspace:*' && sdkDevDependency !== pkg.version) {
  fail(`the @bugdump/sdk devDependency (${sdkDevDependency}) is not the package version (${pkg.version})`);
}

// 5. The exports map and typings pass the standard checkers, against the packed tarball.
try {
  const tarball = execFileSync('pnpm', ['pack', '--pack-destination', 'dist-pack'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .pop();
  try {
    execFileSync('pnpm', ['dlx', 'publint@0.3', tarball], { stdio: 'inherit' });
  } catch {
    fail('publint reported problems');
  }
  try {
    execFileSync('pnpm', ['dlx', '@arethetypeswrong/cli@0.18', tarball, '--profile', 'node16'], { stdio: 'inherit' });
  } catch {
    fail('@arethetypeswrong/cli reported problems');
  }
} finally {
  rmSync('dist-pack', { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\ncheck-dist failed:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exit(1);
}
console.log('check-dist passed');
