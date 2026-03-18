import { Pool, Client } from 'pg';
import { migrations } from '@/db/migrations';

const user = process.env.PGUSER || process.env.USER || 'postgres';
const dbName = `${user}_personal_training_planner`;

const pool = new Pool({
  user: user,
  host: 'localhost',
  database: dbName,
  password: process.env.PGPASSWORD || '',
  port: 5432,
});

let isInitialized = false;

export async function initDB() {
  if (isInitialized) return;

  // Ensure the target database exists
  const client = new Client({
    user: user,
    host: 'localhost',
    database: 'postgres',
    password: process.env.PGPASSWORD || '',
    port: 5432,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if ((res.rowCount ?? 0) === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`PostgreSQL is not running on localhost:5432. Start it and reload.`);
    }
    // Non-connection errors (e.g. permission issues) — log and let migrations attempt
    console.error('Failed to check/create database:', error);
  } finally {
    await client.end();
  }

  // Run pending migrations
  try {
    // Bootstrap the migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(10) PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const applied = await pool.query('SELECT id FROM schema_migrations');
    const appliedIds = new Set(applied.rows.map((r: any) => r.id));

    for (const migration of migrations) {
      if (appliedIds.has(migration.id)) continue;

      console.log(`Running migration ${migration.id}: ${migration.name}`);
      await pool.query(migration.sql);
      await pool.query(
        'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
      console.log(`Migration ${migration.id} applied.`);
    }

    isInitialized = true;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`PostgreSQL is not running on localhost:5432. Start it and reload.`);
    }
    console.error('Migration error:', error);
    throw error;
  }
}

export default pool;
