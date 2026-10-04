import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const [major, minor, patch] = manifest.version.split('.').map(Number);
const options = { 1: `${major + 1}.0.0`, 2: `${major}.${minor + 1}.0`, 3: `${major}.${minor}.${patch + 1}` };
const prompt = createInterface({ input: process.stdin, output: process.stdout });
try {
  const choice = (await prompt.question(`Current: ${manifest.version}\n[1] ${options[1]} (major)\n[2] ${options[2]} (minor)\n[3] ${options[3]} (patch)\n[s] skip\nChoice: `)).trim().toLowerCase();
  if (choice !== 's') {
    if (!Object.hasOwn(options, choice)) throw new Error('Invalid version choice');
    manifest.version = options[choice];
    writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✅ Version: ${manifest.version}`);
  }
} finally {
  prompt.close();
}
