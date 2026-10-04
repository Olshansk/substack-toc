import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const { version } = JSON.parse(readFileSync('manifest.json', 'utf8'));
const archive = path.resolve(`build/substack-toc-v${version}.zip`);
const directory = mkdtempSync(path.join(tmpdir(), 'substack-toc-package-'));
try {
  execFileSync('unzip', ['-q', archive, '-d', directory]);
  assert.deepEqual(readdirSync(directory).sort(), ['icons', 'manifest.json', 'src']);
  execFileSync(process.execPath, ['scripts/validate.mjs', directory], { stdio: 'inherit' });
  function compare(relative) {
    for (const entry of readdirSync(path.join(directory, relative), { withFileTypes: true })) {
      const file = path.join(relative, entry.name);
      if (entry.isDirectory()) compare(file);
      else assert.deepEqual(readFileSync(path.join(directory, file)), readFileSync(file), `Stale archive file: ${file}`);
    }
  }
  compare('');
  console.log('✅ Release archive contains only extension files matching the working tree');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
