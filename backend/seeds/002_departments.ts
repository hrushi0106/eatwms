import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('departments').del();

  // Reset auto-increment for all tables - handle both databases
  const dbClient = knex.client.config.client;
  if (dbClient === 'sqlite3') {
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='departments'");
  } else if (dbClient === 'postgresql') {
    await knex.raw("SELECT setval(pg_get_serial_sequence('departments', 'id'), 1, false)");
  }

  await knex('departments').insert([
    { id: 1, name: 'Development', description: 'Software Development team' },
    { id: 2, name: 'Human Resources', description: 'HR & People team' },
    { id: 3, name: 'Finance', description: 'Finance & Accounting' },
    { id: 4, name: 'Operations', description: 'Operations & Infrastructure' },
    { id: 5, name: 'Marketing', description: 'Marketing & Communications' },
  ]);
}
