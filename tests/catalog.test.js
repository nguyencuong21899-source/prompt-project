import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validCatalog } from '../extension/catalog.js';
const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url)));

test('accepts the published catalog and an empty prompt library', () => {
  assert.equal(validCatalog(catalog), true);
  assert.equal(validCatalog({ ...catalog, prompts: [] }), true);
});
test('rejects corrupt cache or remote data without throwing', () => {
  for (const value of [null, {}, { prompts: [null] },
    { ...catalog, prompts: [{ id: 'broken' }] },
    { ...catalog, prompts: [{ ...catalog.prompts[0], tags: 'not-an-array' }] },
    { ...catalog, prompts: [{ ...catalog.prompts[0], variables: [null] }] },
    { ...catalog, prompts: [{ ...catalog.prompts[0], departmentId: 'missing' }] },
    { ...catalog, prompts: [catalog.prompts[0], catalog.prompts[0]] }
  ]) assert.equal(validCatalog(value), false);
});
