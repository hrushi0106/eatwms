import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('leave_balances').del();

  // Reset auto-increment for all tables - handle both databases
  const dbClient = knex.client.config.client;
  if (dbClient === 'sqlite3') {
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='leave_balances'");
  } else if (dbClient === 'postgresql') {
    await knex.raw("SELECT setval(pg_get_serial_sequence('leave_balances', 'id'), 1, false)");
  }

}
