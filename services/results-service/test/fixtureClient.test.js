import assert from 'node:assert/strict';
import test from 'node:test';
import { createFixtureClient } from '../src/fixtureClient.js';

test('exists() returns true when fixture-service responds ok', async () => {
  const client = createFixtureClient({
    baseUrl: 'http://fixture-service',
    fetchImpl: async () => new Response(null, { status: 200 })
  });

  assert.equal(await client.exists('fixture-001'), true);
});

test('exists() returns false when fixture-service responds 404', async () => {
  const client = createFixtureClient({
    baseUrl: 'http://fixture-service',
    fetchImpl: async () => new Response(null, { status: 404 })
  });

  assert.equal(await client.exists('unknown-fixture'), false);
});

test('exists() rejects when fixture-service returns an unexpected status', async () => {
  const client = createFixtureClient({
    baseUrl: 'http://fixture-service',
    fetchImpl: async () => new Response(null, { status: 500 })
  });

  await assert.rejects(() => client.exists('fixture-001'));
});

test('exists() rejects when fixture-service does not respond within the timeout', async () => {
  const client = createFixtureClient({
    baseUrl: 'http://fixture-service',
    timeoutMs: 10,
    fetchImpl: (url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('The operation was aborted')));
    })
  });

  await assert.rejects(() => client.exists('fixture-001'));
});

test('exists() requests the fixture by id, URL-encoded', async () => {
  let requestedUrl;
  const client = createFixtureClient({
    baseUrl: 'http://fixture-service',
    fetchImpl: async (url) => { requestedUrl = url; return new Response(null, { status: 200 }); }
  });

  await client.exists('fixture with spaces');
  assert.equal(requestedUrl, 'http://fixture-service/v1/fixtures/fixture%20with%20spaces');
});
