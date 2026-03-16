import { Pool, Client } from 'pg';

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

  // Connect to the default 'postgres' database to check/create our target database
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
  } catch (error) {
    console.error('Failed to check/create database:', error);
  } finally {
    await client.end();
  }

  // Now create the table in our target database
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
          id SERIAL PRIMARY KEY,
          external_id TEXT UNIQUE,
          title TEXT NOT NULL,
          activity_type VARCHAR(50),
          workout_date TIMESTAMP WITH TIME ZONE,
          duration_minutes INTEGER,
          is_completed BOOLEAN DEFAULT FALSE,
          is_skipped BOOLEAN DEFAULT FALSE,
          total_volume NUMERIC,
          data JSONB
      );
    `);
    isInitialized = true;
  } catch (error) {
    console.error('Failed to create table:', error);
  }
}

export default pool;