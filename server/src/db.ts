import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Please provide your Neon PostgreSQL connection string.');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function withClient<T>(handler: (client: Pool) => Promise<T>): Promise<T> {
  return handler(pool);
}
