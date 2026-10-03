import { readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

for (const folder of ['.', 'extension']) {
  const root = resolve(folder);
  const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
  if (manifest.manifest_version !== 3) throw Error(`Manifest V3 required in ${folder}`);
  if (manifest.action?.default_popup) throw Error(`Transient popup remains in ${folder}`);
  if (!manifest.permissions?.includes('sidePanel')) throw Error(`Side panel permission missing in ${folder}`);
  const panel = resolve(root, manifest.side_panel?.default_path || '');
  if (!panel.startsWith(root)) throw Error(`Side panel path escapes ${folder}`);
  await access(panel);
  await access(resolve(root, manifest.background?.service_worker || ''));
  for (const path of [...Object.values(manifest.icons || {}), ...Object.values(manifest.action?.default_icon || {})]) {
    const file = resolve(root, path);
    if (!file.startsWith(root)) throw Error(`Icon path escapes ${folder}`);
    const image = await readFile(file);
    if (image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error(`Icon is not PNG: ${path}`);
    const expected = Number(path.match(/(16|32|48|128)\.png$/)?.[1]);
    if (expected && (image.readUInt32BE(16) !== expected || image.readUInt32BE(20) !== expected)) throw Error(`Icon has wrong size: ${path}`);
  }
  const html = await readFile(panel, 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:https?:|#)/.test(match[1])) continue;
    await access(resolve(dirname(panel), match[1]));
  }
  for (const script of manifest.content_scripts || []) {
    for (const file of script.js || []) await access(resolve(root, file));
  }
  console.log(`Manifest OK: ${folder} → ${manifest.side_panel.default_path}`);
}
