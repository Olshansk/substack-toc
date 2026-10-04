import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { Script } from 'node:vm';

const root = path.resolve(process.argv[2] || '.');
const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const files = new Set();
function requireFile(relative) {
  assert(!path.isAbsolute(relative) && !relative.split('/').includes('..'), `Unsafe package path: ${relative}`);
  assert(statSync(path.join(root, relative)).isFile(), `Missing file: ${relative}`);
  files.add(relative);
}
assert.equal(manifest.manifest_version, 3);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.name, 'Substack ToC');
requireFile(manifest.action.default_popup);
for (const icon of Object.values(manifest.icons)) requireFile(icon);
for (const icon of Object.values(manifest.action.default_icon)) requireFile(icon);
for (const script of manifest.content_scripts) {
  for (const file of script.js) requireFile(file);
}
const html = readFileSync(path.join(root, manifest.action.default_popup), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  requireFile(path.posix.normalize(path.posix.join(path.posix.dirname(manifest.action.default_popup), match[1])));
}
const popup = readFileSync(path.join(root, 'src/popup/popup.js'), 'utf8');
for (const match of popup.matchAll(/['"](src\/[^'"]+\.js)['"]/g)) requireFile(match[1]);
function checkScripts(directory) {
  for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) checkScripts(relative);
    else if (entry.name.endsWith('.js')) new Script(readFileSync(path.join(root, relative), 'utf8'), { filename: relative });
  }
}
checkScripts('src');
console.log(`✅ Valid manifest, ${files.size} referenced assets, and JavaScript syntax (${root})`);
