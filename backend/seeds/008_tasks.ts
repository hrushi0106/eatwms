import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (SQLite compatible)
  await knex('task_updates').del();
  
  // Reset auto-increment (SQLite compatible)
  await knex.raw("DELETE FROM sqlite_sequence WHERE name='task_updates'");
  // Clear existing data (SQLite compatible)
  await knex('tasks').del();
  
  // Reset auto-increment (SQLite compatible)
  await knex.raw("DELETE FROM sqlite_sequence WHERE name='tasks'");

  await knex('tasks').insert([
    {
      id: 1,
      project_id: 1,
      assigned_to: 4,
      assigned_by: 3,
      name: 'Design login page mockup',
      description: 'Create Figma mockups for new login page',
      priority: 'HIGH',
      estimated_hours: 8,
      due_date: '2026-08-25',
      status: 'IN_PROGRESS',
      progress_percentage: 60,
    },
    {
      id: 2,
      project_id: 1,
      assigned_to: 5,
      assigned_by: 3,
      name: 'Implement dashboard components',
      description: 'Build React components for employee dashboard',
      priority: 'HIGH',
      estimated_hours: 24,
      due_date: '2026-08-30',
      status: 'TODO',
      progress_percentage: 0,
    },
    {
      id: 3,
      project_id: 2,
      assigned_to: 4,
      assigned_by: 2,
      name: 'API integration spec',
      description: 'Write API specification for payroll integration',
      priority: 'MEDIUM',
      estimated_hours: 16,
      due_date: '2026-09-05',
      status: 'TODO',
      progress_percentage: 0,
    },
    {
      id: 4,
      project_id: 3,
      assigned_to: 5,
      assigned_by: 2,
      name: 'Setup React Native project',
      description: 'Initialize RN project with navigation and auth',
      priority: 'CRITICAL',
      estimated_hours: 8,
      due_date: '2026-08-22',
      status: 'COMPLETED',
      progress_percentage: 100,
    },
  ]);
}
