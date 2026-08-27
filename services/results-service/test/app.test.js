import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createHandler } from '../src/app.js';

function repository() {
  return {
    isReady: async () => {},
    list: async () => [{ id: 'result-001', fixtureId: 'fixture-001', homeScore: 2, awayScore: 1 }],
    create: async (result) => ({ id: 'result-002', status: 'scheduled', ...result })
  };
}

async function startServer(overrides = {}) {
  const server = http.createServer(createHandler({ repository: repository(), now: () => '2026-07-15T12:00:00Z', ...overrides }));
  await new Promise((resolve) => server.listen(0, resolve));
  return server;
}

test('GET /health returns service status', async (t) => {
  const server = await startServer();
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok', service: 'results-service', timestamp: '2026-07-15T12:00:00Z'
  });
});

test('GET /v1/results lists results', async (t) => {
  const server = await startServer();
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/v1/results`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].id, 'result-001');
});

test('POST /v1/results creates a result', async (t) => {
  const server = await startServer();
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/v1/results`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fixtureId: 'fixture-001', homeScore: 3, awayScore: 0 })
  });

  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.id, 'result-002');
});

test('GET /metrics exposes Prometheus metrics', async (t) => {
  const server = await startServer();
  t.after(() => server.close());
  const { port } = server.address();

  await fetch(`http://127.0.0.1:${port}/health`);
  const response = await fetch(`http://127.0.0.1:${port}/metrics`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/plain/);
  assert.match(body, /results_service_http_requests_total\{method="GET",route="\/health",status_code="200"\} 1/);
});
