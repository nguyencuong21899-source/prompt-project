import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';

test('GitHub App key signs a valid installation token request and caches the result', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  process.env.GITHUB_APP_ID = '12345';
  process.env.GITHUB_INSTALLATION_ID = '67890';
  process.env.GITHUB_APP_PRIVATE_KEY = pem.replaceAll('\n', '\\n');
  delete process.env.GITHUB_TOKEN;
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.github.com/app/installations/67890/access_tokens');
    assert.equal(options.method, 'POST');
    const jwt = options.headers.Authorization.slice('Bearer '.length);
    const [header, payload, signature] = jwt.split('.');
    assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'RS256');
    assert.equal(JSON.parse(Buffer.from(payload, 'base64url')).iss, '12345');
    assert.equal(createVerify('RSA-SHA256').update(header + '.' + payload).verify(publicKey, Buffer.from(signature, 'base64url')), true);
    calls++;
    return Response.json({ token: 'installation-token', expires_at: new Date(Date.now() + 3600000).toISOString() });
  };
  try {
    const { githubToken } = await import('../server/lib.js');
    assert.equal(await githubToken(), 'installation-token');
    assert.equal(await githubToken(), 'installation-token');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
