/**
 * Override PostgreSQL type parsers to return JavaScript numbers/strings
 * instead of BigInt for BIGINT and BIGSERIAL columns.
 * 
 * Must be imported BEFORE any database connections are made.
 */
import pg from 'pg';

// OID 20 = BIGINT / BIGSERIAL — parse as string (safe for all values)
pg.types.setTypeParser(20, (val: string) => {
  return val === null ? null : String(val);
});

// OID 1700 = NUMERIC — keep as string too
pg.types.setTypeParser(1700, (val: string) => {
  return val === null ? null : String(val);
});
