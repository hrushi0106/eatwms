import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw('TRUNCATE TABLE roles RESTART IDENTITY CASCADE');
  await knex('roles').insert([
    { id: 1, name: 'ADMIN', description: 'Full system access' },
    { id: 2, name: 'MANAGER', description: 'Access to assigned teams' },
    { id: 3, name: 'TEAM_LEAD', description: 'Access to assigned team members' },
    { id: 4, name: 'EMPLOYEE', description: 'Access to own data only' },
  ]);
}
