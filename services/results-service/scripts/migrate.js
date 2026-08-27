import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL must be set');

const migrationsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const migrationFiles = (await readdir(migrationsDirectory)).filter((file) => file.endsWith('.sql')).sort();
const client = new Client({ connectionString: databaseUrl });

await client.connect();
try {
  for (const file of migrationFiles) {
    await client.query(await readFile(path.join(migrationsDirectory, file), 'utf8'));
    console.log(`Applied ${file}`);
  }
} finally {
  await client.end();
}
