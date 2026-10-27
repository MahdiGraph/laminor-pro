// Packs the extension into installable archives:
//   dist/laminor-pro-chrome-v<version>.zip   (Chrome, Edge, Brave, Opera…)
//   dist/laminor-pro-firefox-v<version>.xpi  (Firefox)
// The Chrome build drops the Firefox-only manifest key so Chrome shows no warning.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'extension');
const dist = join(root, 'dist');
const manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
const { version } = manifest;

function pack(name, transform) {
  const staging = mkdtempSync(join(tmpdir(), 'laminor-pro-'));
  cpSync(source, staging, { recursive: true, filter: (path) => !/(^|\/)\.DS_Store$/.test(path) });
  writeFileSync(join(staging, 'manifest.json'), JSON.stringify(transform(structuredClone(manifest)), null, 2) + '\n');
  const out = join(dist, name);
  rmSync(out, { force: true });
  execFileSync('zip', ['-r', '-X', '-q', out, '.'], { cwd: staging });
  rmSync(staging, { recursive: true, force: true });
  console.log('built', out);
}

mkdirSync(dist, { recursive: true });
pack(`laminor-pro-chrome-v${version}.zip`, (m) => {
  delete m.browser_specific_settings;
  return m;
});
pack(`laminor-pro-firefox-v${version}.xpi`, (m) => m);
