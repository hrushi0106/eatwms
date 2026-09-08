import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw('TRUNCATE TABLE leave_balances RESTART IDENTITY CASCADE');

  const year = 2026;
  const userIds = [1, 2, 3, 4, 5, 6];

  const balances = [];
  for (const userId of userIds) {
    balances.push(
      { user_id: userId, leave_type_id: 1, year, allocated_days: 21, used_days: 0 },
      { user_id: userId, leave_type_id: 2, year, allocated_days: 10, used_days: 0 },
      { user_id: userId, leave_type_id: 3, year, allocated_days: 7,  used_days: 0 },
      { user_id: userId, leave_type_id: 4, year, allocated_days: 30, used_days: 0 },
    );
  }

  await knex('leave_balances').insert(balances);
}
