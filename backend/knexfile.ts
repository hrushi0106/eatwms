import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: process.env.DB_CLIENT || 'sqlite3',
    connection: process.env.DB_CLIENT === 'postgresql' ? {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'eatwms',
      user: process.env.DB_USER || 'eatwms_user',
      password: process.env.DB_PASSWORD || 'password',
    } : {
      filename: './dev_database.sqlite3'
    },
    useNullAsDefault: true, // Required for SQLite
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './migrations',
      extension: 'ts',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'eatwms_test',
      user: process.env.DB_USER || 'eatwms_user',
      password: process.env.DB_PASSWORD || 'password',
    },
    pool: { min: 1, max: 5 },
    migrations: {
      directory: './migrations',
      extension: 'ts',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },

  // ── Neon (production) ──────────────────────────────────────────────────────
  // Neon requires SSL. The connection string from Neon already includes
  // ?sslmode=require, so we just pass it directly.
  production: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required for Neon
    },
    pool: {
      min: 0,          // Neon is serverless — allow pool to go to 0
      max: 10,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
    },
    migrations: {
      directory: './migrations',
      extension: 'ts',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },
};

export default config;
