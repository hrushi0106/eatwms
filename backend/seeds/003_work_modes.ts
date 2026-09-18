import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('work_modes').del();

  // Reset auto-increment for all tables - handle both databases
  const dbClient = knex.client.config.client;
  if (dbClient === 'sqlite3') {
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='work_modes'");
  } else if (dbClient === 'postgresql') {
    await knex.raw("SELECT setval(pg_get_serial_sequence('work_modes', 'id'), 1, false)");
  }

  await knex('work_modes').insert([
    { id: 1, code: 'OFFICE', name: 'Office', description: 'Working from office premises' },
    { id: 2, code: 'WFH', name: 'Work From Home', description: 'Working remotely from home' },
    { id: 3, code: 'HYBRID', name: 'Hybrid', description: 'Combination of office and remote work' },
  ]);
}
