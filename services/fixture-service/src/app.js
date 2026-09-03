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
  if (pathname === '/v1/fixtures') return '/v1/fixtures';
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

export function createHandler({ repository, now = () => new Date().toISOString(), metrics = new MetricsRegistry() }) {
  if (!repository) throw new Error('A fixture repository is required');

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
      return sendJson(response, 200, { status: 'ok', service: 'fixture-service', timestamp: now() });
    }

    // Readiness: process is up AND able to serve traffic. Checks the database,
    // so Kubernetes stops routing traffic here without killing the pod.
    if (request.method === 'GET' && url.pathname === '/readyz') {
      try {
        await repository.isReady();
        return sendJson(response, 200, { status: 'ok', service: 'fixture-service', timestamp: now() });
      } catch {
        return sendJson(response, 503, { status: 'unavailable', service: 'fixture-service' });
      }
    }

    if (request.method === 'GET' && url.pathname === '/v1/fixtures') {
      try {
        return sendJson(response, 200, { data: await repository.list() });
      } catch {
        return sendJson(response, 503, { error: 'Fixture data is temporarily unavailable' });
      }
    }

    if (request.method === 'POST' && url.pathname === '/v1/fixtures') {
      try {
        const fixture = await readJson(request);
        if (!fixture.homeTeam || !fixture.awayTeam || !fixture.kickoff) {
          return sendJson(response, 400, { error: 'homeTeam, awayTeam and kickoff are required' });
        }
        return sendJson(response, 201, { data: await repository.create(fixture) });
      } catch (error) {
        if (error.message === 'Request body must be valid JSON') {
          return sendJson(response, 400, { error: error.message });
        }
        return sendJson(response, 503, { error: 'Fixture data is temporarily unavailable' });
      }
    }

    return sendJson(response, 404, { error: 'Not found' });
  };
}
