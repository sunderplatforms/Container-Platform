import http from 'node:http';
import { createHandler } from './app.js';
import { PostgresFixtureRepository } from './repository.js';

const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL must be set');

const repository = new PostgresFixtureRepository(databaseUrl);
const server = http.createServer(createHandler({ repository }));

server.listen(port, () => {
  console.log(`fixture-service listening on port ${port}`);
});

async function shutdown() {
  server.close();
  await repository.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
