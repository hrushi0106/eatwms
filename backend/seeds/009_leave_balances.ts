import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (works with both SQLite and PostgreSQL)
  await knex('leave_balances').del();
  
  // Reset auto-increment - handle both databases
  const dbClient = knex.client.config.client;
  if (dbClient === 'sqlite3') {
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='leave_balances'");
  } else if (dbClient === 'postgresql') {
    await knex.raw("ALTER SEQUENCE leave_balances_id_seq RESTART WITH 1");
  }

  const year = 2026;
  const userIds = [1, 2, 3, 4, 5, 6];

  const balances = [];
  for (const userId of userIds) {
    balances.push(
      { user_id: userId, leave_type_id: 1, year, allocated_days: 21, used_days: 0 },
      { user_id: userId, leave_type_id: 2, year, allocated_days: 10, used_days: 0 },
      { user_id: userId, leave_type_id: 3, year, allocated_days: 7,  used_days: 0 },
      { user_id: userId, leave_type_id: 4, year, allocated_days: 30, used_days: 0 },
    );
  }

  await knex('leave_balances').insert(balances);
}
