// Integration tests for PostgresFixtureRepository - the one part of the service
// every other test in this suite mocks out. Needs a real, migrated Postgres:
//
//   docker compose up -d fixture-service-postgres
//   DATABASE_URL=postgresql://fixtures:fixtures@localhost:5433/fixtures npm run migrate
//   DATABASE_URL=postgresql://fixtures:fixtures@localhost:5433/fixtures npm run test:integration
//
// Each test creates its own fixtures with random team names rather than
// truncating the table, so this suite is safe to run repeatedly against a
// persistent dev database without cleanup between runs.
import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresFixtureRepository } from '../src/repository.js';

const databaseUrl = process.env.DATABASE_URL;
const skip = databaseUrl ? false : 'Set DATABASE_URL to a real, migrated Postgres to run this suite - see the comment at the top of this file';

test('PostgresFixtureRepository', { skip }, async (t) => {
  const repository = new PostgresFixtureRepository(databaseUrl);
  t.after(() => repository.close());

  await t.test('isReady() resolves against a reachable database', async () => {
    await assert.doesNotReject(() => repository.isReady());
  });

  await t.test('create() persists a fixture that list() and get() can then read back', async () => {
    const created = await repository.create({
      competition: 'Integration Test Cup',
      kickoff: '2027-01-01T12:00:00.000Z',
      homeTeam: `Home ${crypto.randomUUID()}`,
      awayTeam: `Away ${crypto.randomUUID()}`
    });

    assert.ok(created.id);
    assert.equal(created.status, 'scheduled');

    assert.deepEqual(await repository.get(created.id), created);
    assert.ok((await repository.list()).some((fixture) => fixture.id === created.id));
  });

  await t.test('get() returns null for an id that does not exist', async () => {
    assert.equal(await repository.get('00000000-0000-0000-0000-000000000000'), null);
  });

  await t.test('create() rejects a fixture where the home and away teams are the same', async () => {
    const team = `Solo FC ${crypto.randomUUID()}`;
    await assert.rejects(() => repository.create({
      kickoff: '2027-01-01T12:00:00.000Z',
      homeTeam: team,
      awayTeam: team
    }));
  });

  await t.test('list() orders fixtures by kickoff ascending', async () => {
    const later = await repository.create({
      kickoff: '2030-01-01T00:00:00.000Z',
      homeTeam: `Later Home ${crypto.randomUUID()}`,
      awayTeam: `Later Away ${crypto.randomUUID()}`
    });
    const earlier = await repository.create({
      kickoff: '2020-01-01T00:00:00.000Z',
      homeTeam: `Earlier Home ${crypto.randomUUID()}`,
      awayTeam: `Earlier Away ${crypto.randomUUID()}`
    });

    const all = await repository.list();
    const earlierIndex = all.findIndex((fixture) => fixture.id === earlier.id);
    const laterIndex = all.findIndex((fixture) => fixture.id === later.id);
    assert.ok(earlierIndex !== -1 && laterIndex !== -1 && earlierIndex < laterIndex);
  });
});
