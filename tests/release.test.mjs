import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const script = path.resolve('scripts/bump-version.mjs');
test('release version prompt handles every option without touching the real manifest', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'substack-toc-version-'));
  try {
    for (const [choice, version, status] of [['1', '2.0.0', 0], ['2', '1.1.0', 0], ['3', '1.0.5', 0], ['s', '1.0.4', 0], ['invalid', '1.0.4', 1]]) {
      const manifest = path.join(directory, 'manifest.json');
      writeFileSync(manifest, JSON.stringify({ name: 'Substack ToC', version: '1.0.4' }));
      const result = spawnSync(process.execPath, [script], { cwd: directory, input: `${choice}\n`, encoding: 'utf8' });
      assert.equal(result.status, status, result.stderr);
      assert.deepEqual(JSON.parse(readFileSync(manifest)), { name: 'Substack ToC', version });
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
