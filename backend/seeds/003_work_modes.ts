import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw('TRUNCATE TABLE work_modes RESTART IDENTITY CASCADE');
  await knex('work_modes').insert([
    { id: 1, code: 'OFFICE', name: 'Office', description: 'Working from office premises' },
    { id: 2, code: 'WFH', name: 'Work From Home', description: 'Working remotely from home' },
    { id: 3, code: 'HYBRID', name: 'Hybrid', description: 'Combination of office and remote work' },
  ]);
}
