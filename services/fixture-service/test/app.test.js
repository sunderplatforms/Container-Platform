import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createHandler } from '../src/app.js';

function repository() {
  return {
    isReady: async () => {},
    list: async () => [{ id: 'fixture-001', homeTeam: 'North London FC', awayTeam: 'Merseyside FC' }],
    create: async (fixture) => ({ id: 'fixture-002', status: 'scheduled', ...fixture })
  };
}

async function startServer(overrides = {}) {
  const server = http.createServer(createHandler({ repository: repository(), now: () => '2026-07-15T12:00:00Z', ...overrides }));
  await new Promise((resolve) => server.listen(0, resolve));
  return server;
}

test('GET /livez returns ok without touching the repository', async (t) => {
  const failingRepository = {
    isReady: async () => { throw new Error('database is unreachable'); }
  };
  const server = await startServer({ repository: failingRepository });
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/livez`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok', service: 'fixture-service', timestamp: '2026-07-15T12:00:00Z'
  });
});

test('GET /readyz returns ok when the database is reachable', async (t) => {
  const server = await startServer();
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/readyz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok', service: 'fixture-service', timestamp: '2026-07-15T12:00:00Z'
  });
});

test('GET /readyz returns 503 when the database is unreachable', async (t) => {
  const failingRepository = {
    isReady: async () => { throw new Error('database is unreachable'); }
  };
  const server = await startServer({ repository: failingRepository });
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/readyz`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable', service: 'fixture-service' });
});

test('GET /v1/fixtures lists fixtures', async (t) => {
  const server = await startServer();
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/v1/fixtures`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].id, 'fixture-001');
});

test('POST /v1/fixtures creates a fixture', async (t) => {
  const server = await startServer();
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/v1/fixtures`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ homeTeam: 'North London FC', awayTeam: 'Merseyside FC', kickoff: '2026-08-15T14:00:00Z' })
  });

  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.id, 'fixture-002');
});

test('GET /metrics exposes Prometheus metrics', async (t) => {
  const server = await startServer();
  t.after(() => server.close());
  const { port } = server.address();

  await fetch(`http://127.0.0.1:${port}/readyz`);
  const response = await fetch(`http://127.0.0.1:${port}/metrics`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/plain/);
  assert.match(body, /fixture_service_http_requests_total\{method="GET",route="\/readyz",status_code="200"\} 1/);
});
