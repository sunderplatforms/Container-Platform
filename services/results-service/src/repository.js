import pg from 'pg';

const { Pool } = pg;

export class PostgresResultRepository {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
  }

  async isReady() {
    await this.pool.query('SELECT 1');
  }

  async list({ fixtureId } = {}) {
    if (fixtureId) {
      const result = await this.pool.query(
        `SELECT id, fixture_id AS "fixtureId", home_score AS "homeScore", away_score AS "awayScore", status
         FROM results
         WHERE fixture_id = $1
         ORDER BY id ASC`,
        [fixtureId]
      );
      return result.rows;
    }

    const result = await this.pool.query(`
      SELECT id, fixture_id AS "fixtureId", home_score AS "homeScore", away_score AS "awayScore", status
      FROM results
      ORDER BY id ASC
    `);
    return result.rows;
  }

  async create({ fixtureId, homeScore, awayScore, status = 'scheduled' }) {
    const result = await this.pool.query(
      `INSERT INTO results (fixture_id, home_score, away_score, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, fixture_id AS "fixtureId", home_score AS "homeScore", away_score AS "awayScore", status`,
      [fixtureId, homeScore, awayScore, status]
    );
    return result.rows[0];
  }

  async close() {
    await this.pool.end();
  }
}
