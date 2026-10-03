import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const files = (await readdir(new URL('../data/prompts/', import.meta.url))).filter(name => name.endsWith('.json')).sort();
const prompts = await Promise.all(files.map(name => readJson(`data/prompts/${name}`)));
const catalog = {
  schemaVersion: 1,
  departments: await readJson('data/departments.json'),
  categories: await readJson('data/categories.json'),
  prompts,
  links: await readJson('data/links.json')
};
const target = process.argv[2] || new URL('../data/catalog.json', import.meta.url);
await writeFile(target, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Built catalog with ${prompts.length} prompts`);
