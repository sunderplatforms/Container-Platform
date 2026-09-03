// Integration tests for PostgresResultRepository - the one part of the service
// every other test in this suite mocks out. Needs a real, migrated Postgres:
//
//   docker compose up -d results-service-postgres
//   DATABASE_URL=postgresql://results:results@localhost:5434/results npm run migrate
//   DATABASE_URL=postgresql://results:results@localhost:5434/results npm run test:integration
//
// Each test creates its own results scoped to a random fixtureId rather than
// truncating the table, so this suite is safe to run repeatedly against a
// persistent dev database without cleanup between runs. There's no foreign
// key to fixture-service's database here - fixture-service and results-service
// each own a separate database, so fixtureId is just an opaque UUID column as
// far as Postgres is concerned; existence is checked over HTTP, not by the DB.
import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresResultRepository } from '../src/repository.js';

const databaseUrl = process.env.DATABASE_URL;
const skip = databaseUrl ? false : 'Set DATABASE_URL to a real, migrated Postgres to run this suite - see the comment at the top of this file';

test('PostgresResultRepository', { skip }, async (t) => {
  const repository = new PostgresResultRepository(databaseUrl);
  t.after(() => repository.close());

  await t.test('isReady() resolves against a reachable database', async () => {
    await assert.doesNotReject(() => repository.isReady());
  });

  await t.test('create() persists a result that list() and the fixtureId filter can then read back', async () => {
    const fixtureId = crypto.randomUUID();
    const created = await repository.create({ fixtureId, homeScore: 2, awayScore: 1 });

    assert.ok(created.id);
    assert.equal(created.status, 'scheduled');
    assert.equal(created.fixtureId, fixtureId);

    const filtered = await repository.list({ fixtureId });
    assert.equal(filtered.length, 1);
    assert.deepEqual(filtered[0], created);

    assert.ok((await repository.list()).some((result) => result.id === created.id));
  });

  await t.test('list({ fixtureId }) returns nothing for a fixture with no results', async () => {
    assert.deepEqual(await repository.list({ fixtureId: crypto.randomUUID() }), []);
  });

  await t.test('create() rejects a negative score', async () => {
    await assert.rejects(() => repository.create({
      fixtureId: crypto.randomUUID(),
      homeScore: -1,
      awayScore: 0
    }));
  });
});
