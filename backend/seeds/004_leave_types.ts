import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('leave_types').del();

  // Reset auto-increment for all tables - handle both databases
  const dbClient = knex.client.config.client;
  if (dbClient === 'sqlite3') {
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='leave_types'");
  } else if (dbClient === 'postgresql') {
    await knex.raw("SELECT setval(pg_get_serial_sequence('leave_types', 'id'), 1, false)");
  }

  await knex('leave_types').insert([
    { id: 1, name: 'Annual Leave', description: 'Paid annual vacation leave', annual_limit: 21, is_paid: true },
    { id: 2, name: 'Sick Leave', description: 'Medical sick leave', annual_limit: 10, is_paid: true },
    { id: 3, name: 'Casual Leave', description: 'Short-notice personal leave', annual_limit: 7, is_paid: true },
    { id: 4, name: 'Unpaid Leave', description: 'Leave without pay', annual_limit: 30, is_paid: false },
    { id: 5, name: 'Maternity Leave', description: 'Maternity/Paternity leave', annual_limit: 90, is_paid: true },
    { id: 6, name: 'Compensatory Off', description: 'Comp-off for overtime worked', annual_limit: 12, is_paid: true },
  ]);
}
