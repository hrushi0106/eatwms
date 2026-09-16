import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (SQLite compatible)
  await knex('departments').del();
  
  // Reset auto-increment (SQLite compatible)  
  await knex.raw("DELETE FROM sqlite_sequence WHERE name='departments'");
  
  await knex('departments').insert([
    { id: 1, name: 'Development', description: 'Software Development team' },
    { id: 2, name: 'Human Resources', description: 'HR & People team' },
    { id: 3, name: 'Finance', description: 'Finance & Accounting' },
    { id: 4, name: 'Operations', description: 'Operations & Infrastructure' },
    { id: 5, name: 'Marketing', description: 'Marketing & Communications' },
  ]);
}
