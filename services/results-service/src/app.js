import { MetricsRegistry } from './metrics.js';

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function sendMetrics(response, body) {
  response.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' });
  response.end(body);
}

function routeFor(request, pathname) {
  if (request.method === 'GET' && pathname === '/livez') return '/livez';
  if (request.method === 'GET' && pathname === '/readyz') return '/readyz';
  if (request.method === 'GET' && pathname === '/metrics') return '/metrics';
  if (pathname === '/v1/results') return '/v1/results';
  return 'not_found';
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });
    request.on('error', reject);
  });
}

export function createHandler({ repository, fixtureClient, now = () => new Date().toISOString(), metrics = new MetricsRegistry() }) {
  if (!repository) throw new Error('A result repository is required');
  if (!fixtureClient) throw new Error('A fixture client is required');

  return async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    const route = routeFor(request, url.pathname);
    const startedAt = process.hrtime.bigint();
    response.once('finish', () => {
      if (route !== '/metrics') {
        metrics.record({
          method: request.method,
          route,
          statusCode: response.statusCode,
          durationSeconds: Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
        });
      }
    });

    if (request.method === 'GET' && url.pathname === '/metrics') {
      return sendMetrics(response, metrics.render());
    }

    // Liveness: process is up and able to handle requests. No dependency checks,
    // so a database blip never causes Kubernetes to restart a healthy pod.
    if (request.method === 'GET' && url.pathname === '/livez') {
      return sendJson(response, 200, { status: 'ok', service: 'results-service', timestamp: now() });
    }

    // Readiness: process is up AND able to serve traffic. Checks the database,
    // so Kubernetes stops routing traffic here without killing the pod.
    if (request.method === 'GET' && url.pathname === '/readyz') {
      try {
        await repository.isReady();
        return sendJson(response, 200, { status: 'ok', service: 'results-service', timestamp: now() });
      } catch {
        return sendJson(response, 503, { status: 'unavailable', service: 'results-service' });
      }
    }

    if (request.method === 'GET' && url.pathname === '/v1/results') {
      try {
        const fixtureId = url.searchParams.get('fixtureId') ?? undefined;
        return sendJson(response, 200, { data: await repository.list({ fixtureId }) });
      } catch {
        return sendJson(response, 503, { error: 'Result data is temporarily unavailable' });
      }
    }

    if (request.method === 'POST' && url.pathname === '/v1/results') {
      try {
        const result = await readJson(request);
        if (!result.fixtureId || result.homeScore == null || result.awayScore == null) {
          return sendJson(response, 400, { error: 'fixtureId, homeScore and awayScore are required' });
        }

        let fixtureExists;
        try {
          fixtureExists = await fixtureClient.exists(result.fixtureId);
        } catch {
          return sendJson(response, 503, { error: 'Unable to verify fixtureId with fixture-service' });
        }
        if (!fixtureExists) {
          return sendJson(response, 400, { error: `No fixture found for fixtureId ${result.fixtureId}` });
        }

        return sendJson(response, 201, { data: await repository.create(result) });
      } catch (error) {
        if (error.message === 'Request body must be valid JSON') {
          return sendJson(response, 400, { error: error.message });
        }
        return sendJson(response, 503, { error: 'Result data is temporarily unavailable' });
      }
    }

    return sendJson(response, 404, { error: 'Not found' });
  };
}
