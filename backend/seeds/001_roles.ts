import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('roles').del();

  // Reset auto-increment for all tables - handle both databases
  const dbClient = knex.client.config.client;
  if (dbClient === 'sqlite3') {
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='roles'");
  } else if (dbClient === 'postgresql') {
    await knex.raw("SELECT setval(pg_get_serial_sequence('roles', 'id'), 1, false)");
  }

  await knex('roles').insert([
    { id: 1, name: 'ADMIN', description: 'Full system access' },
    { id: 2, name: 'MANAGER', description: 'Access to assigned teams' },
    { id: 3, name: 'TEAM_LEAD', description: 'Access to assigned team members' },
    { id: 4, name: 'EMPLOYEE', description: 'Access to own data only' },
  ]);
}
