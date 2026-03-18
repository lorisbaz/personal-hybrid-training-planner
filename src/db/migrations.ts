// Ordered migration definitions. Each runs exactly once, tracked in schema_migrations.
// Add new migrations at the end — never edit existing ones.

export const migrations: { id: string; name: string; sql: string }[] = [
  {
    id: '001',
    name: 'create_activities',
    sql: `
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
    `,
  },
  {
    id: '002',
    name: 'create_user_profile',
    sql: `
      CREATE TABLE IF NOT EXISTS user_profile (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
  },
];
