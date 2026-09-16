import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (SQLite compatible)
  await knex('roles').del();
  
  // Reset auto-increment (SQLite compatible)
  await knex.raw("DELETE FROM sqlite_sequence WHERE name='roles'");
  
  await knex('roles').insert([
    { id: 1, name: 'ADMIN', description: 'Full system access' },
    { id: 2, name: 'MANAGER', description: 'Access to assigned teams' },
    { id: 3, name: 'TEAM_LEAD', description: 'Access to assigned team members' },
    { id: 4, name: 'EMPLOYEE', description: 'Access to own data only' },
  ]);
}
