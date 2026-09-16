import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (works with both SQLite and PostgreSQL)
  await knex('roles').del();
  
  // Reset auto-increment - handle both databases
  const dbClient = knex.client.config.client;
  if (dbClient === 'sqlite3') {
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='roles'");
  } else if (dbClient === 'postgresql') {
    await knex.raw("ALTER SEQUENCE roles_id_seq RESTART WITH 1");
  }
  
  await knex('roles').insert([
    { id: 1, name: 'ADMIN', description: 'Full system access' },
    { id: 2, name: 'MANAGER', description: 'Access to assigned teams' },
    { id: 3, name: 'TEAM_LEAD', description: 'Access to assigned team members' },
    { id: 4, name: 'EMPLOYEE', description: 'Access to own data only' },
  ]);
}
