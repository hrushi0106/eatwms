import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Remove FK-dependent rows first
  await knex.raw('TRUNCATE TABLE leave_balances RESTART IDENTITY CASCADE');
  await knex.raw('TRUNCATE TABLE users RESTART IDENTITY CASCADE');

  const rounds = 10; // lower for seed speed
  const adminHash = await bcrypt.hash('Admin@123', rounds);
  const managerHash = await bcrypt.hash('Manager@123', rounds);
  const leadHash = await bcrypt.hash('Lead@123', rounds);
  const empHash = await bcrypt.hash('Employee@123', rounds);

  await knex('users').insert([
    {
      id: 1,
      employee_code: 'EMP-001',
      first_name: 'System',
      last_name: 'Admin',
      email: 'admin@company.com',
      password_hash: adminHash,
      role_id: 1, // ADMIN
      department_id: 2,
      joining_date: '2020-01-01',
      status: 'ACTIVE',
    },
    {
      id: 2,
      employee_code: 'EMP-002',
      first_name: 'Rajesh',
      last_name: 'Kumar',
      email: 'manager@company.com',
      password_hash: managerHash,
      role_id: 2, // MANAGER
      department_id: 1,
      joining_date: '2021-03-15',
      status: 'ACTIVE',
    },
    {
      id: 3,
      employee_code: 'EMP-003',
      first_name: 'Priya',
      last_name: 'Sharma',
      email: 'teamlead@company.com',
      password_hash: leadHash,
      role_id: 3, // TEAM_LEAD
      department_id: 1,
      manager_id: 2,
      joining_date: '2021-06-01',
      status: 'ACTIVE',
    },
    {
      id: 4,
      employee_code: 'EMP-004',
      first_name: 'Arun',
      last_name: 'Mehta',
      email: 'employee@company.com',
      password_hash: empHash,
      role_id: 4, // EMPLOYEE
      department_id: 1,
      manager_id: 2,
      team_lead_id: 3,
      joining_date: '2022-01-10',
      status: 'ACTIVE',
    },
    {
      id: 5,
      employee_code: 'EMP-005',
      first_name: 'Sunita',
      last_name: 'Patel',
      email: 'sunita@company.com',
      password_hash: empHash,
      role_id: 4,
      department_id: 1,
      manager_id: 2,
      team_lead_id: 3,
      joining_date: '2022-04-01',
      status: 'ACTIVE',
    },
    {
      id: 6,
      employee_code: 'EMP-006',
      first_name: 'Mohammed',
      last_name: 'Ali',
      email: 'mohammed@company.com',
      password_hash: empHash,
      role_id: 4,
      department_id: 3,
      manager_id: 2,
      joining_date: '2022-07-15',
      status: 'ACTIVE',
    },
  ]);
}
