import http from 'node:http';
import { createHandler } from './app.js';
import { createFixtureClient } from './fixtureClient.js';
import { PostgresResultRepository } from './repository.js';

const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;
const fixtureServiceUrl = process.env.FIXTURE_SERVICE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL must be set');
if (!fixtureServiceUrl) throw new Error('FIXTURE_SERVICE_URL must be set');

const repository = new PostgresResultRepository(databaseUrl);
const fixtureClient = createFixtureClient({ baseUrl: fixtureServiceUrl });
const server = http.createServer(createHandler({ repository, fixtureClient }));

server.listen(port, () => {
  console.log(`results-service listening on port ${port}`);
});

async function shutdown() {
  server.close();
  await repository.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
