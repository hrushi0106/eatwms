import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (works with both SQLite and PostgreSQL)
  await knex('work_modes').del();
  
  // Reset auto-increment - handle both databases
  const dbClient = knex.client.config.client;
  if (dbClient === 'sqlite3') {
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='work_modes'");
  } else if (dbClient === 'postgresql') {
    await knex.raw("ALTER SEQUENCE work_modes_id_seq RESTART WITH 1");
  }
  await knex('work_modes').insert([
    { id: 1, code: 'OFFICE', name: 'Office', description: 'Working from office premises' },
    { id: 2, code: 'WFH', name: 'Work From Home', description: 'Working remotely from home' },
    { id: 3, code: 'HYBRID', name: 'Hybrid', description: 'Combination of office and remote work' },
  ]);
}
