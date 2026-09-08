import Knex from 'knex';
import { env } from './env';
import knexConfig from '../../knexfile';
import pg from 'pg';

// Override PostgreSQL type parsers to prevent BigInt serialization issues
// OID 20 = INT8/BIGINT/BIGSERIAL — return as string
pg.types.setTypeParser(20, (val: string) => val === null ? null : Number(val));
// OID 1700 = NUMERIC
pg.types.setTypeParser(1700, (val: string) => val === null ? null : parseFloat(val));

const environment = env.NODE_ENV === 'test' ? 'test' : env.NODE_ENV === 'production' ? 'production' : 'development';

const db = Knex(knexConfig[environment]);

export default db;
