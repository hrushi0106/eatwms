import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (SQLite compatible)
  await knex('work_modes').del();
  
  // Reset auto-increment (SQLite compatible)
  await knex.raw("DELETE FROM sqlite_sequence WHERE name='work_modes'");
  await knex('work_modes').insert([
    { id: 1, code: 'OFFICE', name: 'Office', description: 'Working from office premises' },
    { id: 2, code: 'WFH', name: 'Work From Home', description: 'Working remotely from home' },
    { id: 3, code: 'HYBRID', name: 'Hybrid', description: 'Combination of office and remote work' },
  ]);
}
