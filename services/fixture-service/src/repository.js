import pg from 'pg';

const { Pool } = pg;

export class PostgresFixtureRepository {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
  }

  async isReady() {
    await this.pool.query('SELECT 1');
  }

  async list() {
    const result = await this.pool.query(`
      SELECT id, competition, kickoff, home_team AS "homeTeam", away_team AS "awayTeam", status
      FROM fixtures
      ORDER BY kickoff ASC
    `);
    return result.rows;
  }

  async create({ competition = null, kickoff, homeTeam, awayTeam, status = 'scheduled' }) {
    const result = await this.pool.query(
      `INSERT INTO fixtures (competition, kickoff, home_team, away_team, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, competition, kickoff, home_team AS "homeTeam", away_team AS "awayTeam", status`,
      [competition, kickoff, homeTeam, awayTeam, status]
    );
    return result.rows[0];
  }

  async close() {
    await this.pool.end();
  }
}
