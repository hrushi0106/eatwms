import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('tasks').del();
  await knex('projects').del();

  // Reset auto-increment for all tables - handle both databases
  const dbClient = knex.client.config.client;
  if (dbClient === 'sqlite3') {
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='tasks'");
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='projects'");
  } else if (dbClient === 'postgresql') {
    await knex.raw("SELECT setval(pg_get_serial_sequence('tasks', 'id'), 1, false)");
    await knex.raw("SELECT setval(pg_get_serial_sequence('projects', 'id'), 1, false)");
  }

  await knex('projects').insert([
    {
      id: 1,
      project_code: 'PRJ-001',
      name: 'Employee Portal Redesign',
      description: 'Modernize the employee self-service portal',
      client_name: 'Internal',
      start_date: '2026-01-01',
      end_date: '2026-06-30',
      status: 'ACTIVE',
      created_by: 2,
    },
    {
      id: 2,
      project_code: 'PRJ-002',
      name: 'Payroll Integration',
      description: 'Integrate attendance with payroll system',
      client_name: 'Internal',
      start_date: '2026-03-01',
      end_date: '2026-09-30',
      status: 'ACTIVE',
      created_by: 1,
    },
    {
      id: 3,
      project_code: 'PRJ-003',
      name: 'Mobile App Development',
      description: 'React Native mobile application',
      client_name: 'External Client A',
      start_date: '2026-02-01',
      end_date: '2026-12-31',
      status: 'ACTIVE',
      created_by: 2,
    },
  ]);
}
